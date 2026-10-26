import { compare } from 'bcryptjs'
import { and, eq, ne } from 'drizzle-orm'
import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { HTTPException } from 'hono/http-exception'
import { createDb, requireDatabaseUrl } from './db/client.ts'
import {
  academicYears,
  attendance,
  classes,
  enquiries,
  feeTypes,
  guardians,
  invoices,
  plans,
  profiles,
  schools,
  studentGuardians,
  students,
} from './db/schema.ts'
import { dashboard } from './routes/dashboard.ts'
import { fees } from './routes/fees.ts'
import { ops } from './routes/ops.ts'
import { parent } from './routes/parent.ts'
import { phase2 } from './routes/phase2.ts'
import { readUser, signUser, type AuthUser } from './session.ts'
import type { Role } from '../src/types/roles.ts'

const COOKIE = 'nd_session'

function db() {
  return createDb(requireDatabaseUrl())
}

function requireUser(cookie: string | undefined): AuthUser {
  const user = readUser(cookie)
  if (!user) {
    throw new HTTPException(401, { message: 'Please sign in.' })
  }
  return user
}

function requireSchoolAdmin(user: AuthUser) {
  if (user.role !== 'school_admin' || !user.schoolId) {
    throw new HTTPException(403, { message: 'School admins only.' })
  }
  return user.schoolId
}

function greetingFor(role: Role, fullName: string) {
  if (role === 'super_admin') return 'All schools'
  if (role === 'school_admin') return `Good morning, ${fullName}`
  if (role === 'teacher') return `Hello, ${fullName}`
  return `Hi, ${fullName}`
}

export const app = new Hono()
app.route('/api', phase2)
app.route('/api', dashboard)
app.route('/api', fees)
app.route('/api', parent)
app.route('/api', ops)

app.onError((error, c) => {
  if (error instanceof HTTPException) {
    return c.json({ error: error.message }, error.status)
  }
  console.error(error)
  return c.json({ error: 'Something went wrong.' }, 500)
})

app.get('/api/health', async (c) => {
  if (!process.env.DATABASE_URL) {
    return c.json({ ok: false, error: 'DATABASE_URL is missing.' }, 503)
  }
  try {
    const rows = await db().select({ id: plans.id, name: plans.name }).from(plans)
    return c.json({
      ok: true,
      branch: process.env.NEON_BRANCH ?? null,
      planCount: rows.length,
    })
  } catch (error) {
    console.error(error)
    return c.json({ ok: false, error: 'Database is unreachable.' }, 503)
  }
})

app.post('/api/auth/login', async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>()
  const email = body.email?.trim().toLowerCase() ?? ''
  const password = body.password ?? ''
  if (!email || !password) {
    throw new HTTPException(400, { message: 'Enter your email and password.' })
  }

  const [profile] = await db().select().from(profiles).where(eq(profiles.email, email)).limit(1)
  if (!profile || !(await compare(password, profile.passwordHash))) {
    throw new HTTPException(401, { message: 'Email or password is wrong.' })
  }

  const user: AuthUser = {
    id: profile.id,
    email: profile.email,
    fullName: profile.fullName,
    role: profile.role as Role,
    schoolId: profile.schoolId,
  }
  setCookie(c, COOKIE, signUser(user), {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 14,
  })
  return c.json({ ok: true })
})

app.post('/api/auth/logout', (c) => {
  deleteCookie(c, COOKIE, { path: '/' })
  return c.json({ ok: true })
})

app.get('/api/auth/me', async (c) => {
  const user = readUser(getCookie(c, COOKIE))
  if (!user) {
    return c.json({ user: null })
  }

  const [profile] = await db().select().from(profiles).where(eq(profiles.id, user.id)).limit(1)
  if (!profile) {
    return c.json({ user: null })
  }

  const school = profile.schoolId
    ? (await db().select().from(schools).where(eq(schools.id, profile.schoolId)).limit(1))[0]
    : undefined
  const year = profile.schoolId
    ? (
        await db()
          .select()
          .from(academicYears)
          .where(and(eq(academicYears.schoolId, profile.schoolId), eq(academicYears.isCurrent, true)))
          .limit(1)
      )[0]
    : undefined
  const taught =
    profile.role === 'teacher'
      ? (
          await db()
            .select()
            .from(classes)
            .where(eq(classes.teacherId, profile.id))
            .limit(1)
        )[0]
      : undefined

  let subtitle = 'Subscriptions, usage and tenant health'
  if (profile.role === 'school_admin' && school) {
    subtitle = `${school.name} · Academic year ${year?.label ?? 'not set'}`
  } else if (profile.role === 'teacher') {
    subtitle = taught ? `${taught.name}` : school?.name ?? 'Teacher'
  } else if (profile.role === 'parent' && school) {
    const [linked] = await db()
      .select({ firstName: students.firstName })
      .from(studentGuardians)
      .innerJoin(guardians, eq(studentGuardians.guardianId, guardians.id))
      .innerJoin(students, eq(studentGuardians.studentId, students.id))
      .where(and(eq(guardians.profileId, profile.id), eq(studentGuardians.schoolId, school.id)))
      .limit(1)
    subtitle = linked ? `Following ${linked.firstName}’s week` : school.name
  }

  return c.json({
    user: {
      id: profile.id,
      fullName: profile.fullName,
      role: profile.role,
      greeting: greetingFor(profile.role as Role, profile.fullName),
      subtitle,
      school: school
        ? {
            id: school.id,
            name: school.name,
            academicYearLabel: year ? `Academic year ${year.label}` : 'Academic year not set',
          }
        : null,
    },
  })
})

app.get('/api/plans', async (c) => {
  requireUser(getCookie(c, COOKIE))
  const rows = await db().select().from(plans)
  return c.json({ plans: rows })
})

app.get('/api/schools', async (c) => {
  const user = requireUser(getCookie(c, COOKIE))
  if (user.role !== 'super_admin') {
    throw new HTTPException(403, { message: 'Platform owner only.' })
  }
  const rows = await db()
    .select({
      id: schools.id,
      name: schools.name,
      status: schools.status,
      renewsOn: schools.renewsOn,
      trialEndsAt: schools.trialEndsAt,
      planName: plans.name,
    })
    .from(schools)
    .innerJoin(plans, eq(schools.planId, plans.id))
  return c.json({ schools: rows })
})

app.get('/api/school', async (c) => {
  const schoolId = requireSchoolAdmin(requireUser(getCookie(c, COOKIE)))
  const [school] = await db().select().from(schools).where(eq(schools.id, schoolId)).limit(1)
  const [plan] = school
    ? await db().select().from(plans).where(eq(plans.id, school.planId)).limit(1)
    : []
  const years = await db()
    .select()
    .from(academicYears)
    .where(eq(academicYears.schoolId, schoolId))
  if (!school) {
    throw new HTTPException(404, { message: 'School not found.' })
  }
  return c.json({ school, plan, years })
})

app.patch('/api/school', async (c) => {
  const schoolId = requireSchoolAdmin(requireUser(getCookie(c, COOKIE)))
  const body = await c.req.json<{
    name?: string
    address?: string
    phone?: string
    email?: string
    logoUrl?: string
    admissionFeePaise?: number
    admissionPrefix?: string
  }>()
  const name = body.name?.trim()
  if (!name) {
    throw new HTTPException(400, { message: 'Enter the school name.' })
  }
  const [school] = await db()
    .update(schools)
    .set({
      name,
      address: body.address?.trim() || null,
      phone: body.phone?.trim() || null,
      email: body.email?.trim() || null,
      logoUrl: body.logoUrl?.trim() || null,
      admissionFeePaise: body.admissionFeePaise ?? 1000000,
      admissionPrefix: body.admissionPrefix?.trim().toUpperCase() || null,
    })
    .where(eq(schools.id, schoolId))
    .returning()
  return c.json({ school })
})

app.post('/api/academic-years', async (c) => {
  const schoolId = requireSchoolAdmin(requireUser(getCookie(c, COOKIE)))
  const body = await c.req.json<{
    label?: string
    startsOn?: string
    endsOn?: string
    isCurrent?: boolean
  }>()
  const label = body.label?.trim()
  if (!label || !body.startsOn || !body.endsOn) {
    throw new HTTPException(400, { message: 'Enter the year label and dates.' })
  }
  if (body.isCurrent) {
    await db()
      .update(academicYears)
      .set({ isCurrent: false })
      .where(eq(academicYears.schoolId, schoolId))
  }
  const [year] = await db()
    .insert(academicYears)
    .values({
      schoolId,
      label,
      startsOn: new Date(body.startsOn),
      endsOn: new Date(body.endsOn),
      isCurrent: Boolean(body.isCurrent),
    })
    .returning()
  return c.json({ year })
})

app.post('/api/academic-years/:id/current', async (c) => {
  const schoolId = requireSchoolAdmin(requireUser(getCookie(c, COOKIE)))
  const id = c.req.param('id')
  await db()
    .update(academicYears)
    .set({ isCurrent: false })
    .where(eq(academicYears.schoolId, schoolId))
  const [year] = await db()
    .update(academicYears)
    .set({ isCurrent: true })
    .where(and(eq(academicYears.id, id), eq(academicYears.schoolId, schoolId)))
    .returning()
  if (!year) {
    throw new HTTPException(404, { message: 'Academic year not found.' })
  }
  return c.json({ year })
})

app.get('/api/classes', async (c) => {
  const schoolId = requireSchoolAdmin(requireUser(getCookie(c, COOKIE)))
  const rows = await db().select().from(classes).where(eq(classes.schoolId, schoolId))
  const teachers = await db()
    .select({ id: profiles.id, fullName: profiles.fullName })
    .from(profiles)
    .where(and(eq(profiles.schoolId, schoolId), eq(profiles.role, 'teacher')))
  const years = await db().select().from(academicYears).where(eq(academicYears.schoolId, schoolId))
  return c.json({ classes: rows, teachers, years })
})

app.post('/api/classes', async (c) => {
  const schoolId = requireSchoolAdmin(requireUser(getCookie(c, COOKIE)))
  const body = await c.req.json<{
    name?: string
    ageRange?: string
    capacity?: number
    teacherId?: string | null
    academicYearId?: string
    monthlyFeePaise?: number
  }>()
  const name = body.name?.trim()
  const capacity = Number(body.capacity)
  if (!name || !body.academicYearId || !Number.isFinite(capacity) || capacity < 1) {
    throw new HTTPException(400, { message: 'Enter the class name, year and capacity.' })
  }
  const [year] = await db()
    .select()
    .from(academicYears)
    .where(and(eq(academicYears.id, body.academicYearId), eq(academicYears.schoolId, schoolId)))
    .limit(1)
  if (!year) {
    throw new HTTPException(400, { message: 'Pick an academic year for this school.' })
  }
  const [row] = await db()
    .insert(classes)
    .values({
      schoolId,
      academicYearId: year.id,
      name,
      ageRange: body.ageRange?.trim() || null,
      capacity,
      teacherId: body.teacherId || null,
      monthlyFeePaise: Number.isFinite(Number(body.monthlyFeePaise))
        ? Math.round(Number(body.monthlyFeePaise))
        : 650000,
    })
    .returning()
  return c.json({ class: row })
})

app.patch('/api/classes/:id', async (c) => {
  const schoolId = requireSchoolAdmin(requireUser(getCookie(c, COOKIE)))
  const id = c.req.param('id')
  const body = await c.req.json<{
    name?: string
    ageRange?: string
    capacity?: number
    teacherId?: string | null
    monthlyFeePaise?: number
  }>()
  const name = body.name?.trim()
  const capacity = Number(body.capacity)
  if (!name || !Number.isFinite(capacity) || capacity < 1) {
    throw new HTTPException(400, { message: 'Enter the class name and capacity.' })
  }
  const [row] = await db()
    .update(classes)
    .set({
      name,
      ageRange: body.ageRange?.trim() || null,
      capacity,
      teacherId: body.teacherId || null,
      monthlyFeePaise: Number.isFinite(Number(body.monthlyFeePaise))
        ? Math.round(Number(body.monthlyFeePaise))
        : 650000,
    })
    .where(and(eq(classes.id, id), eq(classes.schoolId, schoolId)))
    .returning()
  if (!row) {
    throw new HTTPException(404, { message: 'Class not found.' })
  }
  return c.json({ class: row })
})

app.get('/api/isolation-check', async (c) => {
  const user = requireUser(getCookie(c, COOKIE))
  if (user.role !== 'school_admin' || !user.schoolId) {
    throw new HTTPException(403, { message: 'School admins only.' })
  }
  const own = await db().select().from(classes).where(eq(classes.schoolId, user.schoolId))
  const visibleStudents = await db().select().from(students).where(eq(students.schoolId, user.schoolId))
  const otherStudents = await db().select({ id: students.id }).from(students).where(ne(students.schoolId, user.schoolId))
  const visibleEnquiries = await db().select().from(enquiries).where(eq(enquiries.schoolId, user.schoolId))
  const otherEnquiries = await db()
    .select({ id: enquiries.id })
    .from(enquiries)
    .where(ne(enquiries.schoolId, user.schoolId))
  const visibleAttendance = await db().select().from(attendance).where(eq(attendance.schoolId, user.schoolId))
  const otherAttendance = await db()
    .select({ id: attendance.id })
    .from(attendance)
    .where(ne(attendance.schoolId, user.schoolId))
  const visibleInvoices = await db().select().from(invoices).where(eq(invoices.schoolId, user.schoolId))
  const otherInvoices = await db().select({ id: invoices.id }).from(invoices).where(ne(invoices.schoolId, user.schoolId))
  const visibleFeeTypes = await db().select().from(feeTypes).where(eq(feeTypes.schoolId, user.schoolId))
  const otherFeeTypes = await db().select({ id: feeTypes.id }).from(feeTypes).where(ne(feeTypes.schoolId, user.schoolId))
  const leaked =
    own.filter((row) => row.schoolId !== user.schoolId).length +
    visibleStudents.filter((row) => row.schoolId !== user.schoolId).length +
    visibleEnquiries.filter((row) => row.schoolId !== user.schoolId).length +
    visibleAttendance.filter((row) => row.schoolId !== user.schoolId).length +
    visibleInvoices.filter((row) => row.schoolId !== user.schoolId).length +
    visibleFeeTypes.filter((row) => row.schoolId !== user.schoolId).length
  return c.json({
    schoolId: user.schoolId,
    classCount: own.length,
    studentCount: visibleStudents.length,
    enquiryCount: visibleEnquiries.length,
    attendanceCount: visibleAttendance.length,
    invoiceCount: visibleInvoices.length,
    feeTypeCount: visibleFeeTypes.length,
    otherSchoolStudents: otherStudents.length,
    otherSchoolEnquiries: otherEnquiries.length,
    otherSchoolAttendance: otherAttendance.length,
    otherSchoolInvoices: otherInvoices.length,
    otherSchoolFeeTypes: otherFeeTypes.length,
    leaked,
    ok:
      leaked === 0 &&
      otherStudents.length > 0 &&
      otherEnquiries.length > 0 &&
      otherAttendance.length > 0 &&
      otherInvoices.length > 0 &&
      otherFeeTypes.length > 0,
  })
})
