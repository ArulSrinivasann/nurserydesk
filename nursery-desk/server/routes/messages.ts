import { and, desc, eq, inArray } from 'drizzle-orm'
import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { HTTPException } from 'hono/http-exception'
import { formatDayMonth } from '../../src/lib/dates.ts'
import { remainingPaise } from '../../src/lib/fees.ts'
import {
  applyMergeTags,
  familyLabel,
  firstNameOf,
  messageKind,
  reminderPreview,
  type ReminderTone,
} from '../../src/lib/messages.ts'
import { COUNTED, enrolledStudents } from '../attendance.ts'
import {
  announcements,
  classes,
  invoiceItems,
  invoices,
  payments,
  schools,
  students,
} from '../db/schema.ts'
import { paidByItem } from '../fees.ts'
import { db, requireSchoolAdmin, requireUser } from '../http.ts'
import { guardiansForStudents, notifyAnnouncement } from '../notify.ts'

const COOKIE = 'nd_session'
const REMINDER_AUDIENCE = 'reminders'

function uniqueGuardianCount(rows: Array<{ email: string | null; phone: string | null; name: string }>) {
  const seen = new Set<string>()
  for (const row of rows) {
    seen.add(row.email || row.phone || row.name)
  }
  return seen.size
}

function isReminderTone(value: string): value is ReminderTone {
  return value === 'friendly' || value === 'overdue'
}

function daysAgoKey(days: number, now = new Date()) {
  const date = new Date(now)
  date.setDate(date.getDate() - days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export const messages = new Hono()

messages.get('/messages', async (c) => {
  const schoolId = requireSchoolAdmin(requireUser(getCookie(c, COOKIE)))
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const threeDaysAgo = daysAgoKey(3, now)

  const [school, classRows, noticeRows, childRows, invoiceRows, itemRows, payRows] = await Promise.all([
    db().select({ name: schools.name }).from(schools).where(eq(schools.id, schoolId)).limit(1).then((rows) => rows[0]),
    db()
      .select({ id: classes.id, name: classes.name })
      .from(classes)
      .where(eq(classes.schoolId, schoolId))
      .orderBy(classes.name),
    db().select().from(announcements).where(eq(announcements.schoolId, schoolId)).orderBy(desc(announcements.createdAt)),
    db()
      .select()
      .from(students)
      .where(and(eq(students.schoolId, schoolId), inArray(students.status, COUNTED))),
    db().select().from(invoices).where(eq(invoices.schoolId, schoolId)),
    db().select().from(invoiceItems).where(eq(invoiceItems.schoolId, schoolId)),
    db().select().from(payments).where(eq(payments.schoolId, schoolId)),
  ])

  const className = new Map(classRows.map((row) => [row.id, row.name]))
  const enrolled = childRows.filter((row) => row.classId)
  const enrolledIds = enrolled.map((row) => row.id)
  const guardianRows = await guardiansForStudents(schoolId, enrolledIds)

  const allFamilies = uniqueGuardianCount(guardianRows)
  const familiesByClass = new Map<string, number>()
  for (const klass of classRows) {
    const ids = enrolled.filter((row) => row.classId === klass.id).map((row) => row.id)
    const rows = guardianRows.filter((row) => ids.includes(row.studentId))
    familiesByClass.set(klass.id, uniqueGuardianCount(rows))
  }

  const paid = await paidByItem(
    schoolId,
    itemRows.map((row) => row.id),
  )
  const remainingByInvoice = new Map<string, number>()
  const remainingByStudent = new Map<string, number>()
  for (const item of itemRows) {
    const left = remainingPaise(item.amountPaise, paid.get(item.id) ?? 0)
    remainingByInvoice.set(item.invoiceId, (remainingByInvoice.get(item.invoiceId) ?? 0) + left)
    remainingByStudent.set(item.studentId, (remainingByStudent.get(item.studentId) ?? 0) + left)
  }

  const parentByStudent = new Map<string, string>()
  for (const row of guardianRows) {
    if (!parentByStudent.has(row.studentId)) parentByStudent.set(row.studentId, row.name)
  }

  const duesFamilies = childRows
    .map((child) => {
      const remaining = remainingByStudent.get(child.id) ?? 0
      if (remaining <= 0) return null
      const open = invoiceRows.filter(
        (row) => row.studentId === child.id && (remainingByInvoice.get(row.id) ?? 0) > 0,
      )
      const overdue = open.some((row) => row.status === 'overdue')
      const dueOn =
        open
          .map((row) => row.dueOn)
          .filter((value): value is string => Boolean(value))
          .sort()[0] ?? null
      const parentName = parentByStudent.get(child.id) ?? 'Parent'
      return {
        studentId: child.id,
        familyName: familyLabel(child.lastName, parentName),
        parentName,
        parentFirst: firstNameOf(parentName),
        childFirst: child.firstName,
        childName: `${child.firstName} ${child.lastName ?? ''}`.trim(),
        className: (child.classId && className.get(child.classId)) || 'Unassigned',
        remainingPaise: remaining,
        status: overdue ? ('overdue' as const) : ('due' as const),
        dueOn,
        dueLabel: overdue ? 'Overdue' : dueOn ? `Due ${formatDayMonth(dueOn)}` : 'Due',
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'overdue' ? -1 : 1
      return b.remainingPaise - a.remainingPaise
    })

  const list = noticeRows.map((row) => {
    const audienceLabel =
      row.audience === 'all'
        ? 'All parents'
        : row.audience === REMINDER_AUDIENCE
          ? 'Fee reminder'
          : row.audience === 'selected'
            ? 'Selected parents'
            : row.audience.includes(',')
              ? row.audience
                  .split(',')
                  .map((id) => className.get(id) ?? 'Class')
                  .join(', ')
              : (className.get(row.audience) ?? 'Class')
    const sentTo = row.audience === 'all' ? allFamilies : (familiesByClass.get(row.audience) ?? 0)
    return {
      id: row.id,
      title: row.title,
      body: row.body,
      audience: row.audience,
      audienceLabel,
      kind: messageKind(row.title, row.body),
      sentTo,
      createdAt: row.createdAt.toISOString(),
    }
  })

  const remindersSent = list.filter(
    (row) => row.kind === 'alert' && new Date(row.createdAt) >= monthStart,
  ).length
  const paidWithin3DaysPaise = payRows
    .filter((row) => row.paidOn >= threeDaysAgo)
    .reduce((sum, row) => sum + row.totalPaise, 0)

  const parents = enrolled.map((child) => {
    const parentName = parentByStudent.get(child.id) ?? 'Parent'
    return {
      studentId: child.id,
      parentName,
      parentFirst: firstNameOf(parentName),
      childFirst: child.firstName,
      childName: `${child.firstName} ${child.lastName ?? ''}`.trim(),
      classId: child.classId,
      className: (child.classId && className.get(child.classId)) || 'Unassigned',
    }
  })

  return c.json({
    schoolName: school?.name ?? '',
    monthLabel: new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(now),
    parentCount: allFamilies,
    sample: {
      parentFirst:
        parents.find((row) => row.childFirst === 'Aarav')?.parentFirst ?? parents[0]?.parentFirst ?? 'Rahul',
      childFirst: parents.find((row) => row.childFirst === 'Aarav')?.childFirst ?? parents[0]?.childFirst ?? 'Aarav',
    },
    classes: classRows.map((row) => ({
      id: row.id,
      name: row.name,
      parentCount: familiesByClass.get(row.id) ?? 0,
    })),
    parents,
    messages: list,
    dues: {
      families: duesFamilies,
      parentCount: duesFamilies.length,
      overdueCount: duesFamilies.filter((row) => row.status === 'overdue').length,
      pendingPaise: duesFamilies.reduce((sum, row) => sum + row.remainingPaise, 0),
      remindersSent,
      paidWithin3DaysPaise,
    },
  })
})

messages.post('/messages', async (c) => {
  const schoolId = requireSchoolAdmin(requireUser(getCookie(c, COOKIE)))
  const body = (await c.req.json()) as {
    title?: string
    body?: string
    audience?: string
    classIds?: string[]
    studentIds?: string[]
    scheduledFor?: string | null
  }
  const title = body.title?.trim() ?? ''
  const text = body.body?.trim() ?? ''
  if (!title || !text) {
    throw new HTTPException(400, { message: 'Enter a title and a message for parents.' })
  }

  const classRows = await db()
    .select({ id: classes.id, name: classes.name })
    .from(classes)
    .where(eq(classes.schoolId, schoolId))
  const classIds = [...new Set(body.classIds ?? [])]
  const studentIds = [...new Set(body.studentIds ?? [])]
  if (classIds.some((id) => !classRows.some((row) => row.id === id))) {
    throw new HTTPException(400, { message: 'Pick classes in this school.' })
  }

  let audience = body.audience?.trim() || 'all'
  let kids =
    studentIds.length > 0
      ? await db()
          .select()
          .from(students)
          .where(and(eq(students.schoolId, schoolId), inArray(students.id, studentIds)))
      : classIds.length > 0
        ? (await Promise.all(classIds.map((id) => enrolledStudents(schoolId, id)))).flat()
        : audience !== 'all'
          ? await enrolledStudents(schoolId, audience)
          : await enrolledStudents(schoolId)

  if (studentIds.length > 0) {
    if (kids.length !== studentIds.length) {
      throw new HTTPException(400, { message: 'Those children are not in this school.' })
    }
    audience = studentIds.length === 1 ? studentIds[0] ?? 'selected' : 'selected'
  } else if (classIds.length > 0) {
    audience = classIds.join(',')
  }

  const seenKids = new Set<string>()
  kids = kids.filter((kid) => {
    if (!kid.classId || seenKids.has(kid.id)) return false
    seenKids.add(kid.id)
    return true
  })

  const [school] = await db().select({ name: schools.name }).from(schools).where(eq(schools.id, schoolId)).limit(1)
  const scheduledFor = body.scheduledFor?.trim() || null
  const historyBody = scheduledFor ? `${text}\n\nScheduled for ${scheduledFor}.` : text

  const [row] = await db()
    .insert(announcements)
    .values({ schoolId, title, body: historyBody, audience })
    .returning()
  if (!row) throw new HTTPException(500, { message: 'Could not send the message.' })

  if (!scheduledFor) {
    const guardians = await guardiansForStudents(
      schoolId,
      kids.map((kid) => kid.id),
    )
    const parentByStudent = new Map<string, string>()
    for (const item of guardians) {
      if (!parentByStudent.has(item.studentId)) parentByStudent.set(item.studentId, item.name)
    }
    await Promise.all(
      kids.map((kid) =>
        notifyAnnouncement(
          schoolId,
          [kid.id],
          title,
          applyMergeTags(text, {
            parent: firstNameOf(parentByStudent.get(kid.id) ?? 'Parent'),
            child: kid.firstName,
            school: school?.name ?? '',
          }),
        ),
      ),
    )
  }

  return c.json({
    id: row.id,
    title: row.title,
    body: row.body,
    audience: row.audience,
    kind: messageKind(row.title, row.body),
    sent: scheduledFor ? 0 : kids.length,
    createdAt: row.createdAt.toISOString(),
  })
})

messages.post('/messages/reminders', async (c) => {
  const schoolId = requireSchoolAdmin(requireUser(getCookie(c, COOKIE)))
  const body = (await c.req.json()) as { studentIds?: string[]; tone?: string }
  const tone = body.tone ?? 'friendly'
  const studentIds = [...new Set(body.studentIds ?? [])]
  if (!isReminderTone(tone)) {
    throw new HTTPException(400, { message: 'Pick a friendly reminder or an overdue notice.' })
  }
  if (studentIds.length === 0) {
    throw new HTTPException(400, { message: 'Tick at least one family.' })
  }

  const [school] = await db().select({ name: schools.name }).from(schools).where(eq(schools.id, schoolId)).limit(1)
  const kids = await db()
    .select()
    .from(students)
    .where(and(eq(students.schoolId, schoolId), inArray(students.id, studentIds)))
  if (kids.length !== studentIds.length) {
    throw new HTTPException(400, { message: 'Those children are not in this school.' })
  }

  const itemRows = await db()
    .select()
    .from(invoiceItems)
    .where(and(eq(invoiceItems.schoolId, schoolId), inArray(invoiceItems.studentId, studentIds)))
  const invoiceRows = await db()
    .select()
    .from(invoices)
    .where(and(eq(invoices.schoolId, schoolId), inArray(invoices.studentId, studentIds)))
  const paid = await paidByItem(
    schoolId,
    itemRows.map((row) => row.id),
  )
  const remainingByStudent = new Map<string, number>()
  const remainingByInvoice = new Map<string, number>()
  for (const item of itemRows) {
    const left = remainingPaise(item.amountPaise, paid.get(item.id) ?? 0)
    remainingByInvoice.set(item.invoiceId, (remainingByInvoice.get(item.invoiceId) ?? 0) + left)
    remainingByStudent.set(item.studentId, (remainingByStudent.get(item.studentId) ?? 0) + left)
  }
  const guardians = await guardiansForStudents(schoolId, studentIds)
  const parentByStudent = new Map<string, string>()
  for (const row of guardians) {
    if (!parentByStudent.has(row.studentId)) parentByStudent.set(row.studentId, row.name)
  }

  const title = tone === 'overdue' ? 'Overdue notice' : 'Fee reminder'
  await Promise.all(
    kids.map((child) => {
      const remaining = remainingByStudent.get(child.id) ?? 0
      if (remaining <= 0) return Promise.resolve()
      const dueOn =
        invoiceRows
          .filter((row) => row.studentId === child.id && (remainingByInvoice.get(row.id) ?? 0) > 0)
          .map((row) => row.dueOn)
          .filter((value): value is string => Boolean(value))
          .sort()[0] ?? null
      const parentName = parentByStudent.get(child.id) ?? 'Parent'
      const text = reminderPreview({
        tone,
        parentFirst: firstNameOf(parentName),
        childFirst: child.firstName,
        amountPaise: remaining,
        dueOn,
        schoolName: school?.name ?? '',
      })
      return notifyAnnouncement(schoolId, [child.id], title, text)
    }),
  )

  const sent = kids.filter((child) => (remainingByStudent.get(child.id) ?? 0) > 0).length
  if (sent === 0) {
    throw new HTTPException(400, { message: 'Those families have no pending fees.' })
  }

  await db()
    .insert(announcements)
    .values({
      schoolId,
      title,
      body: `Sent to ${sent} ${sent === 1 ? 'family' : 'families'} by WhatsApp and SMS.`,
      audience: REMINDER_AUDIENCE,
    })

  return c.json({ sent })
})
