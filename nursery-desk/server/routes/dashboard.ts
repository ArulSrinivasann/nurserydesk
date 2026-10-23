import { and, desc, eq, inArray } from 'drizzle-orm'
import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { lastSchoolDays, toDateKey, weekdayLabel } from '../../src/lib/attendance.ts'
import { classDayPct, marksForDays } from '../attendance.ts'
import { academicYears, classes, guardians, invoiceItems, invoices, payments, studentGuardians, students } from '../db/schema.ts'
import { paidByItem } from '../fees.ts'
import { db, requireSchoolAdmin, requireUser } from '../http.ts'
import { remainingPaise } from '../../src/lib/fees.ts'

const COOKIE = 'nd_session'
const COUNTED = ['applied', 'documents_pending', 'enrolled', 'ready']

export const dashboard = new Hono()

dashboard.get('/dashboard', async (c) => {
  const schoolId = requireSchoolAdmin(requireUser(getCookie(c, COOKIE)))
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const [year] = await db()
    .select()
    .from(academicYears)
    .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.isCurrent, true)))
    .limit(1)
  const classRows = await db().select().from(classes).where(eq(classes.schoolId, schoolId))
  const childRows = await db()
    .select()
    .from(students)
    .where(and(eq(students.schoolId, schoolId), inArray(students.status, COUNTED)))
  const enrolledThisMonth = childRows.filter((row) => {
    if (!row.admittedOn) return false
    const admitted = row.admittedOn instanceof Date ? row.admittedOn : new Date(row.admittedOn)
    return admitted >= monthStart
  }).length
  const recent = await db()
    .select()
    .from(students)
    .where(eq(students.schoolId, schoolId))
    .orderBy(desc(students.admittedOn), desc(students.admissionNo))
    .limit(4)
  const links = await db()
    .select({
      studentId: studentGuardians.studentId,
      parentName: guardians.fullName,
    })
    .from(studentGuardians)
    .innerJoin(guardians, eq(studentGuardians.guardianId, guardians.id))
    .where(eq(studentGuardians.schoolId, schoolId))
  const parentByStudent = new Map<string, string>()
  for (const link of links) {
    if (!parentByStudent.has(link.studentId)) {
      parentByStudent.set(link.studentId, link.parentName)
    }
  }
  const enrolledByClass = new Map<string, number>()
  for (const row of childRows) {
    if (row.classId) {
      enrolledByClass.set(row.classId, (enrolledByClass.get(row.classId) ?? 0) + 1)
    }
  }
  const enrolledIds = new Set(childRows.filter((row) => row.classId).map((row) => row.id))
  const today = toDateKey(now)
  const weekDays = lastSchoolDays(5, now)
  const weekMarks = await marksForDays(schoolId, weekDays)
  const todayMarks = weekMarks.filter((row) => row.date === today)
  const presentTodayPct = todayMarks.length === 0 ? null : classDayPct(enrolledIds, today, todayMarks)
  const previousDay = weekDays[weekDays.length - 2]
  const previousPct = previousDay ? classDayPct(enrolledIds, previousDay, weekMarks) : null
  const delta =
    presentTodayPct != null && previousPct != null ? presentTodayPct - previousPct : null
  const monthStartKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const payRows = await db().select().from(payments).where(eq(payments.schoolId, schoolId))
  const invoiceRows = await db().select().from(invoices).where(eq(invoices.schoolId, schoolId))
  const itemRows = await db().select().from(invoiceItems).where(eq(invoiceItems.schoolId, schoolId))
  const paid = await paidByItem(
    schoolId,
    itemRows.map((row) => row.id),
  )
  const billed = invoiceRows
    .filter((row) => row.issuedOn >= monthStartKey)
    .reduce((sum, row) => sum + row.totalPaise, 0)
  const feesCollectedPaise = payRows
    .filter((row) => row.paidOn >= monthStartKey)
    .reduce((sum, row) => sum + row.totalPaise, 0)
  const overdueIds = new Set(invoiceRows.filter((row) => row.status === 'overdue').map((row) => row.id))
  let overduePaise = 0
  for (const item of itemRows) {
    if (!overdueIds.has(item.invoiceId)) continue
    overduePaise += remainingPaise(item.amountPaise, paid.get(item.id) ?? 0)
  }

  return c.json({
    yearLabel: year?.label ?? 'Academic year not set',
    monthLabel: new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(now),
    enrolled: childRows.length,
    enrolledThisMonth,
    presentTodayPct,
    presentTodayHint:
      presentTodayPct == null
        ? 'No register saved today'
        : delta == null
          ? 'Present or late today'
          : `${delta > 0 ? '+' : ''}${delta}% vs yesterday`,
    presentTodayTrend: delta == null ? 'neutral' : delta >= 0 ? 'up' : 'down',
    feesCollectedPaise,
    feesCollectedPct: billed === 0 ? 0 : Math.round((feesCollectedPaise / billed) * 100),
    overdueCount: overdueIds.size,
    overduePaise,
    classes: classRows.map((row) => ({
      id: row.id,
      name: row.name,
      childCount: enrolledByClass.get(row.id) ?? 0,
      capacity: row.capacity,
    })),
    week: weekDays.map((day) => ({
      label: weekdayLabel(day),
      pct: enrolledIds.size === 0 ? null : classDayPct(enrolledIds, day, weekMarks),
    })),
    recentAdmissions: recent.map((row) => ({
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      admissionNo: row.admissionNo,
      className: classRows.find((item) => item.id === row.classId)?.name ?? 'Unassigned',
      rollNo: row.rollNo,
      parentName: parentByStudent.get(row.id) ?? '—',
      status: row.status,
    })),
  })
})
