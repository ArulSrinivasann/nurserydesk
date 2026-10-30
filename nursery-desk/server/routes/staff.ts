import { hash } from 'bcryptjs'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { HTTPException } from 'hono/http-exception'
import { randomBytes } from 'node:crypto'
import {
  parseStaffCreate,
  parseTeacherAssignment,
  parseUserUpdate,
  SCHOOL_USER_ROLES,
  type SchoolUserRole,
} from '../../src/lib/staff.ts'
import { classes, profiles } from '../db/schema.ts'
import { db, requireSchoolAdmin, requireUser } from '../http.ts'

const COOKIE = 'nd_session'

const ROLE_ORDER: Record<SchoolUserRole, number> = {
  school_admin: 0,
  teacher: 1,
  parent: 2,
}

function generateStaffPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const bytes = randomBytes(10)
  let password = 'Nd-'
  for (const byte of bytes) {
    password += chars[byte % chars.length]
  }
  return password
}

function isSchoolUserRole(value: string): value is SchoolUserRole {
  return (SCHOOL_USER_ROLES as readonly string[]).includes(value)
}

function publicUser(
  row: { id: string; fullName: string; email: string; phone: string | null; role: string },
  classNames: string[],
) {
  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    role: isSchoolUserRole(row.role) ? row.role : 'teacher',
    classNames,
  }
}

export const staff = new Hono()

staff.get('/staff', async (c) => {
  const schoolId = requireSchoolAdmin(requireUser(getCookie(c, COOKIE)))
  const rows = await db()
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      email: profiles.email,
      phone: profiles.phone,
      role: profiles.role,
    })
    .from(profiles)
    .where(eq(profiles.schoolId, schoolId))
  const classRows = await db()
    .select({ name: classes.name, teacherId: classes.teacherId })
    .from(classes)
    .where(eq(classes.schoolId, schoolId))
  const people = rows
    .filter((row) => row.role === 'teacher' || row.role === 'school_admin')
    .map((row) =>
      publicUser(
        row,
        classRows.filter((item) => item.teacherId === row.id).map((item) => item.name),
      ),
    )
    .sort(
      (a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.fullName.localeCompare(b.fullName, 'en-IN'),
    )
  return c.json({ staff: people })
})

staff.post('/staff', async (c) => {
  const schoolId = requireSchoolAdmin(requireUser(getCookie(c, COOKIE)))
  const parsed = parseStaffCreate(await c.req.json())
  if (!parsed.ok) {
    throw new HTTPException(400, { message: parsed.error })
  }

  const [existing] = await db()
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.email, parsed.value.email))
    .limit(1)
  if (existing) {
    throw new HTTPException(409, { message: 'That login email is already used. Pick another.' })
  }

  const password = generateStaffPassword()
  const [row] = await db()
    .insert(profiles)
    .values({
      schoolId,
      role: parsed.value.role,
      fullName: parsed.value.fullName,
      phone: parsed.value.phone,
      email: parsed.value.email,
      passwordHash: await hash(password, 10),
    })
    .returning({
      id: profiles.id,
      fullName: profiles.fullName,
      email: profiles.email,
      phone: profiles.phone,
      role: profiles.role,
    })
  if (!row) {
    throw new HTTPException(500, { message: 'Could not create the staff member.' })
  }
  return c.json({ staff: publicUser(row, []), password })
})

staff.get('/users', async (c) => {
  const schoolId = requireSchoolAdmin(requireUser(getCookie(c, COOKIE)))
  const rows = await db()
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      email: profiles.email,
      phone: profiles.phone,
      role: profiles.role,
    })
    .from(profiles)
    .where(eq(profiles.schoolId, schoolId))
  const classRows = await db()
    .select({ name: classes.name, teacherId: classes.teacherId })
    .from(classes)
    .where(eq(classes.schoolId, schoolId))
  const users = rows
    .filter((row) => isSchoolUserRole(row.role))
    .map((row) =>
      publicUser(
        row,
        classRows.filter((item) => item.teacherId === row.id).map((item) => item.name),
      ),
    )
    .sort(
      (a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.fullName.localeCompare(b.fullName, 'en-IN'),
    )
  return c.json({ users })
})

staff.patch('/users/:id', async (c) => {
  const schoolId = requireSchoolAdmin(requireUser(getCookie(c, COOKIE)))
  const parsed = parseUserUpdate(await c.req.json())
  if (!parsed.ok) {
    throw new HTTPException(400, { message: parsed.error })
  }
  const [row] = await db()
    .update(profiles)
    .set({ fullName: parsed.value.fullName, phone: parsed.value.phone })
    .where(and(eq(profiles.id, c.req.param('id')), eq(profiles.schoolId, schoolId)))
    .returning({
      id: profiles.id,
      fullName: profiles.fullName,
      email: profiles.email,
      phone: profiles.phone,
      role: profiles.role,
    })
  if (!row) {
    throw new HTTPException(404, { message: 'User not found.' })
  }
  const classRows = await db()
    .select({ name: classes.name })
    .from(classes)
    .where(and(eq(classes.schoolId, schoolId), eq(classes.teacherId, row.id)))
  return c.json({ user: publicUser(row, classRows.map((item) => item.name)) })
})

staff.post('/users/:id/reset-password', async (c) => {
  const schoolId = requireSchoolAdmin(requireUser(getCookie(c, COOKIE)))
  const password = generateStaffPassword()
  const [row] = await db()
    .update(profiles)
    .set({ passwordHash: await hash(password, 10) })
    .where(and(eq(profiles.id, c.req.param('id')), eq(profiles.schoolId, schoolId)))
    .returning({
      id: profiles.id,
      fullName: profiles.fullName,
      email: profiles.email,
    })
  if (!row) {
    throw new HTTPException(404, { message: 'User not found.' })
  }
  return c.json({ user: row, password })
})

staff.patch('/staff/assignments/:classId', async (c) => {
  const schoolId = requireSchoolAdmin(requireUser(getCookie(c, COOKIE)))
  const parsed = parseTeacherAssignment(await c.req.json())
  if (!parsed.ok) {
    throw new HTTPException(400, { message: parsed.error })
  }
  if (parsed.teacherId) {
    const [teacher] = await db()
      .select({ id: profiles.id })
      .from(profiles)
      .where(
        and(
          eq(profiles.id, parsed.teacherId),
          eq(profiles.schoolId, schoolId),
          eq(profiles.role, 'teacher'),
        ),
      )
      .limit(1)
    if (!teacher) {
      throw new HTTPException(400, { message: 'Pick a teacher from this school.' })
    }
  }
  const [row] = await db()
    .update(classes)
    .set({ teacherId: parsed.teacherId })
    .where(and(eq(classes.id, c.req.param('classId')), eq(classes.schoolId, schoolId)))
    .returning()
  if (!row) {
    throw new HTTPException(404, { message: 'Class not found.' })
  }
  return c.json({ class: row })
})
