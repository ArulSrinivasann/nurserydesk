import { and, eq, inArray } from 'drizzle-orm'
import { attendancePct, lastSchoolDays, presentOrLate, type AttendanceStatus } from '../src/lib/attendance.ts'
import { attendance, students } from './db/schema.ts'
import { db } from './http.ts'

export const COUNTED = ['applied', 'documents_pending', 'enrolled', 'ready']

export type MarkRow = {
  studentId: string
  classId: string
  date: string
  status: string
}

export async function enrolledStudents(schoolId: string, classId?: string) {
  const filters = [eq(students.schoolId, schoolId), inArray(students.status, COUNTED)]
  if (classId) filters.push(eq(students.classId, classId))
  return db().select().from(students).where(and(...filters))
}

export async function marksForDays(schoolId: string, days: string[], classId?: string) {
  if (days.length === 0) return []
  const filters = [eq(attendance.schoolId, schoolId), inArray(attendance.date, days)]
  if (classId) filters.push(eq(attendance.classId, classId))
  return db().select().from(attendance).where(and(...filters))
}

export function studentPct(studentId: string, days: string[], marks: MarkRow[]) {
  const present = marks.filter((row) => row.studentId === studentId && presentOrLate(row.status)).length
  return attendancePct(present, days.length)
}

export function classDayPct(enrolledIds: Set<string>, day: string, marks: MarkRow[]) {
  if (enrolledIds.size === 0) return 0
  const present = marks.filter(
    (row) => row.date === day && enrolledIds.has(row.studentId) && presentOrLate(row.status),
  ).length
  return attendancePct(present, enrolledIds.size)
}

export async function attendancePctByStudent(schoolId: string, studentIds: string[], days = lastSchoolDays(20)) {
  const marks = await marksForDays(schoolId, days)
  const map = new Map<string, number | null>()
  for (const id of studentIds) {
    const hasMarks = marks.some((row) => row.studentId === id)
    map.set(id, hasMarks ? studentPct(id, days, marks) : null)
  }
  return map
}

export function countsForDay(enrolledIds: Set<string>, day: string, marks: MarkRow[]) {
  let present = 0
  let late = 0
  for (const row of marks) {
    if (row.date !== day || !enrolledIds.has(row.studentId)) continue
    if (row.status === 'present') present += 1
    if (row.status === 'late') late += 1
  }
  const enrolled = enrolledIds.size
  const absent = Math.max(0, enrolled - present - late)
  return { present, late, absent, enrolled, pct: attendancePct(present + late, enrolled) }
}

export { presentOrLate }
export type { AttendanceStatus }
