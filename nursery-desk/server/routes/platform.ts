import { hash } from 'bcryptjs'
import { and, desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { HTTPException } from 'hono/http-exception'
import { randomBytes } from 'node:crypto'
import {
  addMonths,
  defaultAcademicYear,
  parseDemoRequest,
  parseIsoDate,
  trialEndDate,
} from '../../src/lib/platform.ts'
import { academicYears, demoRequests, plans, profiles, schools } from '../db/schema.ts'
import { db, requireSuperAdmin, requireUser } from '../http.ts'
import { notifyDemoRequest } from '../notify.ts'

const COOKIE = 'nd_session'

function generateSchoolPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const bytes = randomBytes(10)
  let password = 'Nd-'
  for (const byte of bytes) {
    password += chars[byte % chars.length]
  }
  return password
}

export const platform = new Hono()

platform.post('/demo-requests', async (c) => {
  const parsed = parseDemoRequest(await c.req.json())
  if (!parsed.ok) {
    throw new HTTPException(400, { message: parsed.error })
  }

  const [row] = await db()
    .insert(demoRequests)
    .values({
      schoolName: parsed.value.schoolName,
      contactName: parsed.value.contactName,
      phone: parsed.value.phone,
      email: parsed.value.email,
      note: parsed.value.note,
      status: 'new',
    })
    .returning()

  await notifyDemoRequest({
    schoolName: parsed.value.schoolName,
    contactName: parsed.value.contactName,
    email: parsed.value.email,
    phone: parsed.value.phone,
  })

  return c.json({ ok: true, id: row?.id })
})

platform.get('/demo-requests', async (c) => {
  requireSuperAdmin(requireUser(getCookie(c, COOKIE)))
  const rows = await db()
    .select({
      id: demoRequests.id,
      schoolName: demoRequests.schoolName,
      contactName: demoRequests.contactName,
      phone: demoRequests.phone,
      email: demoRequests.email,
      note: demoRequests.note,
      status: demoRequests.status,
      convertedSchoolId: demoRequests.convertedSchoolId,
      convertedSchoolName: schools.name,
      createdAt: demoRequests.createdAt,
    })
    .from(demoRequests)
    .leftJoin(schools, eq(demoRequests.convertedSchoolId, schools.id))
    .orderBy(desc(demoRequests.createdAt))

  return c.json({
    requests: rows,
    unread: rows.filter((row) => row.status === 'new').length,
  })
})

platform.patch('/demo-requests/:id', async (c) => {
  requireSuperAdmin(requireUser(getCookie(c, COOKIE)))
  const id = c.req.param('id')
  const body = await c.req.json<{ status?: string }>()
  if (body.status !== 'dismissed') {
    throw new HTTPException(400, { message: 'You can only dismiss a request from here.' })
  }
  const [existing] = await db().select().from(demoRequests).where(eq(demoRequests.id, id)).limit(1)
  if (!existing) {
    throw new HTTPException(404, { message: 'Demo request not found.' })
  }
  if (existing.status === 'converted') {
    throw new HTTPException(409, { message: 'This request already has a school.' })
  }
  const [row] = await db()
    .update(demoRequests)
    .set({ status: 'dismissed' })
    .where(and(eq(demoRequests.id, id), eq(demoRequests.status, 'new')))
    .returning()
  return c.json({ request: row ?? existing })
})

platform.post('/schools', async (c) => {
  requireSuperAdmin(requireUser(getCookie(c, COOKIE)))
  const body = await c.req.json<{
    name?: string
    phone?: string
    email?: string
    adminName?: string
    adminEmail?: string
    adminPhone?: string
    planId?: string
    status?: string
    trialEndsAt?: string
    demoRequestId?: string
  }>()

  const name = body.name?.trim() ?? ''
  const adminName = body.adminName?.trim() ?? ''
  const adminEmail = body.adminEmail?.trim().toLowerCase() ?? ''
  const planId = body.planId?.trim() ?? ''
  const status = body.status === 'active' ? 'active' : 'trial'
  if (!name) {
    throw new HTTPException(400, { message: 'Enter the school name.' })
  }
  if (!adminName) {
    throw new HTTPException(400, { message: 'Enter the school admin’s name.' })
  }
  if (!adminEmail || !adminEmail.includes('@')) {
    throw new HTTPException(400, { message: 'Enter a login email for the school admin.' })
  }
  if (!planId) {
    throw new HTTPException(400, { message: 'Pick a plan.' })
  }

  const [plan] = await db().select().from(plans).where(eq(plans.id, planId)).limit(1)
  if (!plan) {
    throw new HTTPException(400, { message: 'Pick a plan.' })
  }

  if (body.demoRequestId) {
    const [request] = await db()
      .select()
      .from(demoRequests)
      .where(eq(demoRequests.id, body.demoRequestId))
      .limit(1)
    if (!request) {
      throw new HTTPException(404, { message: 'Demo request not found.' })
    }
    if (request.status === 'converted') {
      throw new HTTPException(409, { message: 'This request already has a school.' })
    }
  }

  const [existing] = await db()
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.email, adminEmail))
    .limit(1)
  if (existing) {
    throw new HTTPException(409, { message: 'That login email is already used. Pick another.' })
  }

  const trialEndsAt =
    status === 'trial'
      ? (body.trialEndsAt ? parseIsoDate(body.trialEndsAt) : trialEndDate())
      : null
  if (status === 'trial' && !trialEndsAt) {
    throw new HTTPException(400, { message: 'Pick a trial end date.' })
  }

  const [school] = await db()
    .insert(schools)
    .values({
      name,
      phone: body.phone?.trim() || null,
      email: body.email?.trim().toLowerCase() || adminEmail,
      planId: plan.id,
      status,
      trialEndsAt,
      renewsOn: status === 'active' ? addMonths(new Date(), 1) : null,
    })
    .returning()
  if (!school) {
    throw new HTTPException(500, { message: 'Could not create the school.' })
  }

  const password = generateSchoolPassword()
  const passwordHash = await hash(password, 10)
  await db().insert(profiles).values({
    schoolId: school.id,
    role: 'school_admin',
    fullName: adminName,
    phone: body.adminPhone?.trim() || null,
    email: adminEmail,
    passwordHash,
  })

  const year = defaultAcademicYear()
  await db().insert(academicYears).values({
    schoolId: school.id,
    label: year.label,
    startsOn: year.startsOn,
    endsOn: year.endsOn,
    isCurrent: true,
  })

  if (body.demoRequestId) {
    await db()
      .update(demoRequests)
      .set({ status: 'converted', convertedSchoolId: school.id })
      .where(eq(demoRequests.id, body.demoRequestId))
  }

  return c.json({
    school: {
      id: school.id,
      name: school.name,
      status: school.status,
      trialEndsAt: school.trialEndsAt,
      planName: plan.name,
    },
    admin: {
      fullName: adminName,
      email: adminEmail,
      password,
    },
  })
})
