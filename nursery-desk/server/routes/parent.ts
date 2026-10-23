import { and, desc, eq, inArray } from 'drizzle-orm'
import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { HTTPException } from 'hono/http-exception'
import {
  LEARNING_AREAS,
  levelLabel,
  levelTrend,
  overallLevel,
  periodRange,
  presentOrLate,
  toDateKey,
} from '../../src/lib/attendance.ts'
import { isParentPaymentMethod } from '../../src/lib/fees.ts'
import { formatDate } from '../../src/lib/dates.ts'
import { attendancePctByStudent, marksForDays, studentPct } from '../attendance.ts'
import {
  academicYears,
  announcements,
  assessmentTerms,
  assessments,
  classes,
  dailyUpdates,
  guardians,
  profiles,
  progressRemarks,
  schools,
  studentGuardians,
  students,
} from '../db/schema.ts'
import { dueByStudent, loadReceipt, pendingItems, recordPayment } from '../fees.ts'
import { db, requireParent, requireUser } from '../http.ts'
import { paymentProvider } from '../payments.ts'
import { readUpload } from '../uploads.ts'

const COOKIE = 'nd_session'

function timeLabel(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

function announcementKind(title: string, body: string) {
  const text = `${title} ${body}`.toLowerCase()
  if (text.includes('closed') || text.includes('holiday')) return 'holiday' as const
  return 'event' as const
}

async function childrenOf(userId: string, schoolId: string) {
  return db()
    .select({
      id: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
      classId: students.classId,
      rollNo: students.rollNo,
      admissionNo: students.admissionNo,
    })
    .from(studentGuardians)
    .innerJoin(guardians, eq(studentGuardians.guardianId, guardians.id))
    .innerJoin(students, eq(studentGuardians.studentId, students.id))
    .where(and(eq(guardians.profileId, userId), eq(studentGuardians.schoolId, schoolId)))
}

async function ownedChild(userId: string, schoolId: string, studentId: string) {
  const kids = await childrenOf(userId, schoolId)
  const child = kids.find((row) => row.id === studentId)
  if (!child) throw new HTTPException(403, { message: 'You can only open your own child.' })
  return child
}

export const parent = new Hono()

parent.get('/parent/home', async (c) => {
  const user = requireUser(getCookie(c, COOKIE))
  const schoolId = requireParent(user)
  const kids = await childrenOf(user.id, schoolId)
  if (kids.length === 0) {
    return c.json({ children: [], child: null })
  }
  const requested = c.req.query('studentId')
  const child = kids.find((row) => row.id === requested) ?? kids[0]
  if (!child) {
    return c.json({ children: [], child: null })
  }
  const [klass] = child.classId
    ? await db().select().from(classes).where(eq(classes.id, child.classId)).limit(1)
    : []
  const [teacher] = klass?.teacherId
    ? await db().select().from(profiles).where(eq(profiles.id, klass.teacherId)).limit(1)
    : []
  const now = new Date()
  const today = toDateKey(now)
  const month = periodRange('month', now)
  const monthMarks = await marksForDays(schoolId, month.days)
  const todayMark = monthMarks.find((row) => row.studentId === child.id && row.date === today)
  const presentDays = monthMarks.filter((row) => row.studentId === child.id && presentOrLate(row.status)).length
  const hasMarks = monthMarks.some((row) => row.studentId === child.id)
  const attendancePct =
    month.days.length === 0 || !hasMarks ? null : studentPct(child.id, month.days, monthMarks)
  const dues = await dueByStudent(schoolId, [child.id])
  const pending = await pendingItems(schoolId, child.id)
  const nextDue = pending.find((item) => item.mandatory)?.dueOn ?? pending[0]?.dueOn ?? null
  const terms = await db()
    .select()
    .from(assessmentTerms)
    .where(eq(assessmentTerms.schoolId, schoolId))
    .orderBy(desc(assessmentTerms.startsOn))
  const currentTerm = terms.find((row) => row.isCurrent) ?? terms[0]
  const previousTerm = terms.find((row) => row.id !== currentTerm?.id) ?? null
  const scores = currentTerm
    ? await db()
        .select()
        .from(assessments)
        .where(and(eq(assessments.studentId, child.id), eq(assessments.termId, currentTerm.id)))
    : []
  const previousScores = previousTerm
    ? await db()
        .select()
        .from(assessments)
        .where(and(eq(assessments.studentId, child.id), eq(assessments.termId, previousTerm.id)))
    : []
  const learningStars = scores.reduce((sum, row) => sum + row.level, 0)
  const previousStars = previousScores.reduce((sum, row) => sum + row.level, 0)
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  const updates = child.classId
    ? await db()
        .select()
        .from(dailyUpdates)
        .where(and(eq(dailyUpdates.schoolId, schoolId), eq(dailyUpdates.classId, child.classId)))
        .orderBy(dailyUpdates.createdAt)
    : []
  const timeline = updates
    .filter((row) => {
      const created = row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt)
      return created >= start && created < end
    })
    .map((row) => ({
      id: row.id,
      time: timeLabel(row.createdAt),
      body: row.body,
    }))
  const noticeRows = await db()
    .select()
    .from(announcements)
    .where(eq(announcements.schoolId, schoolId))
    .orderBy(desc(announcements.createdAt))
    .limit(10)
  const notices = noticeRows
    .filter((row) => row.audience === 'all' || row.audience === child.classId || row.audience === klass?.name)
    .map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      kind: announcementKind(row.title, row.body),
    }))
  const reportCards = []
  for (const term of terms) {
    const levels = (
      await db()
        .select()
        .from(assessments)
        .where(and(eq(assessments.studentId, child.id), eq(assessments.termId, term.id)))
    ).map((row) => row.level)
    if (levels.length === 0) continue
    reportCards.push({
      termId: term.id,
      label: term.label,
      overall: overallLevel(levels),
      overallLabel: levelLabel(overallLevel(levels)),
      isCurrent: term.isCurrent,
    })
  }
  return c.json({
    children: kids.map((row) => ({
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
    })),
    child: {
      id: child.id,
      firstName: child.firstName,
      lastName: child.lastName,
      className: klass?.name ?? 'Unassigned',
      teacherName: teacher?.fullName ?? null,
      presentToday: todayMark ? presentOrLate(todayMark.status) : null,
    },
    attendance: {
      pct: attendancePct,
      presentDays,
      workingDays: month.days.length,
      monthLabel: new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(now),
    },
    feeBalancePaise: dues.get(child.id) ?? 0,
    feeDueLabel: nextDue
      ? `Due ${new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(`${nextDue}T00:00:00`))}`
      : 'Paid up',
    learningStars,
    learningStarsDelta: learningStars - previousStars,
    timeline,
    announcements: notices,
    reportCards,
  })
})

parent.get('/parent/fees', async (c) => {
  const user = requireUser(getCookie(c, COOKIE))
  const schoolId = requireParent(user)
  const kids = await childrenOf(user.id, schoolId)
  if (kids.length === 0) {
    return c.json({ children: [], student: null, items: [] })
  }
  const requested = c.req.query('studentId')
  const child = kids.find((row) => row.id === requested) ?? kids[0]
  if (!child) {
    return c.json({ children: [], student: null, items: [] })
  }
  const [klass] = child.classId
    ? await db().select().from(classes).where(eq(classes.id, child.classId)).limit(1)
    : []
  const [year] = await db()
    .select()
    .from(academicYears)
    .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.isCurrent, true)))
    .limit(1)
  const items = await pendingItems(schoolId, child.id)
  return c.json({
    children: kids.map((row) => ({ id: row.id, firstName: row.firstName, lastName: row.lastName })),
    student: {
      id: child.id,
      firstName: child.firstName,
      lastName: child.lastName,
      className: klass?.name ?? 'Unassigned',
      rollNo: child.rollNo,
      admissionNo: child.admissionNo,
      parentName: user.fullName,
      yearLabel: year?.label ?? '',
    },
    items,
  })
})

parent.post('/parent/payments', async (c) => {
  const user = requireUser(getCookie(c, COOKIE))
  const schoolId = requireParent(user)
  const body = await c.req.json<{
    studentId?: string
    method?: string
    itemIds?: string[]
  }>()
  if (!body.studentId) throw new HTTPException(400, { message: 'Pick a child.' })
  await ownedChild(user.id, schoolId, body.studentId)
  if (!body.method || !isParentPaymentMethod(body.method)) {
    throw new HTTPException(400, { message: 'Choose UPI, Card or Net banking.' })
  }
  const pending = await pendingItems(schoolId, body.studentId)
  const itemIds = body.itemIds ?? []
  const selected = pending.filter((item) => itemIds.includes(item.id))
  if (selected.length === 0) {
    throw new HTTPException(400, { message: 'Tick the fees being paid.' })
  }
  const totalPaise = selected.reduce((sum, item) => sum + item.amountPaise, 0)
  const charged = await paymentProvider.charge({
    amountPaise: totalPaise,
    method: body.method,
    studentId: body.studentId,
    schoolId,
  })
  if (!charged.ok) {
    throw new HTTPException(402, { message: charged.message })
  }
  const result = await recordPayment({
    schoolId,
    studentId: body.studentId,
    method: body.method,
    reference: charged.providerRef,
    itemIds: selected.map((item) => item.id),
    receivedBy: user.id,
  })
  return c.json({ paymentId: result.paymentId, receiptNo: result.receiptNo })
})

parent.get('/parent/payments/:id', async (c) => {
  const user = requireUser(getCookie(c, COOKIE))
  const schoolId = requireParent(user)
  const receipt = await loadReceipt(schoolId, c.req.param('id'))
  if (!receipt) throw new HTTPException(404, { message: 'Receipt not found.' })
  await ownedChild(user.id, schoolId, receipt.student.id)
  return c.json(receipt)
})

parent.get('/parent/report', async (c) => {
  const user = requireUser(getCookie(c, COOKIE))
  const schoolId = requireParent(user)
  const studentId = c.req.query('studentId')
  const termId = c.req.query('termId')
  if (!studentId || !termId) throw new HTTPException(400, { message: 'Pick a child and a term.' })
  const child = await ownedChild(user.id, schoolId, studentId)
  const [term] = await db()
    .select()
    .from(assessmentTerms)
    .where(and(eq(assessmentTerms.id, termId), eq(assessmentTerms.schoolId, schoolId)))
    .limit(1)
  if (!term) throw new HTTPException(404, { message: 'Report not found.' })
  const [school] = await db().select().from(schools).where(eq(schools.id, schoolId)).limit(1)
  const [year] = await db()
    .select()
    .from(academicYears)
    .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.isCurrent, true)))
    .limit(1)
  const [klass] = child.classId
    ? await db().select().from(classes).where(eq(classes.id, child.classId)).limit(1)
    : []
  const [teacher] = klass?.teacherId
    ? await db().select().from(profiles).where(eq(profiles.id, klass.teacherId)).limit(1)
    : []
  const previousTerm = (
    await db()
      .select()
      .from(assessmentTerms)
      .where(eq(assessmentTerms.schoolId, schoolId))
      .orderBy(desc(assessmentTerms.startsOn))
  ).find((row) => row.id !== term.id && row.startsOn < term.startsOn)
  const currentRows = await db()
    .select()
    .from(assessments)
    .where(and(eq(assessments.studentId, child.id), eq(assessments.termId, term.id)))
  const previousRows = previousTerm
    ? await db()
        .select()
        .from(assessments)
        .where(and(eq(assessments.studentId, child.id), eq(assessments.termId, previousTerm.id)))
    : []
  const [remark] = await db()
    .select()
    .from(progressRemarks)
    .where(and(eq(progressRemarks.studentId, child.id), eq(progressRemarks.termId, term.id)))
    .limit(1)
  const pcts = await attendancePctByStudent(schoolId, [child.id])
  const areas = LEARNING_AREAS.map((area) => {
    const level = currentRows.find((row) => row.area === area)?.level ?? 0
    const previousLevel = previousRows.find((row) => row.area === area)?.level ?? 0
    return {
      area,
      level,
      previousLevel,
      trend: levelTrend(level, previousLevel),
    }
  })
  const levels = areas.map((row) => row.level).filter((level) => level > 0)
  return c.json({
    school: school
      ? {
          name: school.name,
          address: school.address,
          yearLabel: year?.label ?? '',
        }
      : null,
    term: { id: term.id, label: term.label },
    previousTerm: previousTerm ? { id: previousTerm.id, label: previousTerm.label } : null,
    issued: formatDate(new Date()),
    student: {
      firstName: child.firstName,
      lastName: child.lastName,
      className: klass?.name ?? 'Unassigned',
      rollNo: child.rollNo,
      teacherName: teacher?.fullName ?? '—',
      attendancePct: pcts.get(child.id) ?? null,
      overall: overallLevel(levels),
      remark: remark?.remark ?? '',
      areas,
    },
  })
})

parent.get('/parent/photos', async (c) => {
  const user = requireUser(getCookie(c, COOKIE))
  const schoolId = requireParent(user)
  const path = c.req.query('path') ?? ''
  if (!path.startsWith(`updates/${schoolId}/`)) {
    throw new HTTPException(404, { message: 'Photo not found.' })
  }
  const kids = await childrenOf(user.id, schoolId)
  const classIds = kids.map((row) => row.classId).filter((id): id is string => Boolean(id))
  if (classIds.length === 0) throw new HTTPException(404, { message: 'Photo not found.' })
  const updates = await db()
    .select({ id: dailyUpdates.id, classId: dailyUpdates.classId })
    .from(dailyUpdates)
    .where(and(eq(dailyUpdates.schoolId, schoolId), inArray(dailyUpdates.classId, classIds)))
  if (!updates.some((row) => path.includes(`/${row.id}/`))) {
    throw new HTTPException(404, { message: 'Photo not found.' })
  }
  const bytes = await readUpload(path)
  return new Response(bytes, { headers: { 'Content-Type': 'image/jpeg' } })
})
