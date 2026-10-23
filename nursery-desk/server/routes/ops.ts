import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { HTTPException } from 'hono/http-exception'
import {
  ATTENDANCE_STATUSES,
  LEARNING_AREAS,
  attendancePct,
  isLowChild,
  lastSchoolDays,
  levelTrend,
  needsSupport,
  overallLevel,
  periodLabel,
  periodRange,
  presentOrLate,
  toDateKey,
  type AttendanceStatus,
  type LearningArea,
} from '../../src/lib/attendance.ts'
import {
  attendancePctByStudent,
  classDayPct,
  countsForDay,
  enrolledStudents,
  marksForDays,
  studentPct,
} from '../attendance.ts'
import {
  academicYears,
  announcements,
  assessmentTerms,
  assessments,
  attendance,
  classes,
  dailyUpdates,
  profiles,
  progressRemarks,
  schools,
} from '../db/schema.ts'
import { db, requireSchoolAdmin, requireTeacher, requireUser } from '../http.ts'
import { decodeBase64File, readUpload, saveUpload } from '../uploads.ts'

const COOKIE = 'nd_session'

type PhotoBody = {
  fileName?: string
  contentType?: string
  dataBase64?: string
}

function isStatus(value: string): value is AttendanceStatus {
  return (ATTENDANCE_STATUSES as readonly string[]).includes(value)
}

function isArea(value: string): value is LearningArea {
  return (LEARNING_AREAS as readonly string[]).includes(value)
}

function extFor(contentType: string) {
  if (contentType === 'image/png') return 'png'
  if (contentType === 'image/webp') return 'webp'
  return 'jpg'
}

function contentTypeFor(path: string) {
  if (path.endsWith('.png')) return 'image/png'
  if (path.endsWith('.webp')) return 'image/webp'
  if (path.endsWith('.pdf')) return 'application/pdf'
  return 'image/jpeg'
}

function asDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value)
}

function timeLabel(value: Date | string) {
  const date = asDate(value)
  return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

async function ownedClass(userId: string, schoolId: string, classId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(classId)) {
    throw new HTTPException(403, { message: 'You can only open your own class.' })
  }
  const [row] = await db()
    .select()
    .from(classes)
    .where(and(eq(classes.id, classId), eq(classes.schoolId, schoolId), eq(classes.teacherId, userId)))
    .limit(1)
  if (!row) {
    throw new HTTPException(403, { message: 'You can only open your own class.' })
  }
  return row
}

async function currentTerm(schoolId: string) {
  const [term] = await db()
    .select()
    .from(assessmentTerms)
    .where(and(eq(assessmentTerms.schoolId, schoolId), eq(assessmentTerms.isCurrent, true)))
    .limit(1)
  return term
}

function asTime(value: Date | string) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime()
}

async function previousTerm(schoolId: string, current: typeof assessmentTerms.$inferSelect) {
  const rows = await db().select().from(assessmentTerms).where(eq(assessmentTerms.schoolId, schoolId))
  return (
    rows
      .filter((row) => row.id !== current.id && asTime(row.endsOn) <= asTime(current.startsOn))
      .sort((a, b) => asTime(b.endsOn) - asTime(a.endsOn))[0] ?? null
  )
}

export const ops = new Hono()

ops.get('/teacher/classes', async (c) => {
  const user = requireUser(getCookie(c, COOKIE))
  const schoolId = requireTeacher(user)
  const rows = await db()
    .select({ id: classes.id, name: classes.name })
    .from(classes)
    .where(and(eq(classes.schoolId, schoolId), eq(classes.teacherId, user.id)))
  return c.json({ classes: rows })
})

ops.get('/teacher/attendance', async (c) => {
  const user = requireUser(getCookie(c, COOKIE))
  const schoolId = requireTeacher(user)
  const classId = c.req.query('classId')
  if (!classId) throw new HTTPException(400, { message: 'Pick a class.' })
  const klass = await ownedClass(user.id, schoolId, classId)
  const date = c.req.query('date') || toDateKey(new Date())
  const kids = await enrolledStudents(schoolId, classId)
  const marks = await marksForDays(schoolId, [date], classId)
  const byStudent = new Map(marks.map((row) => [row.studentId, row.status]))
  const saved = marks.length > 0
  const list = kids
    .sort((a, b) => (a.rollNo ?? 99) - (b.rollNo ?? 99))
    .map((row) => ({
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      rollNo: row.rollNo,
      status: (byStudent.get(row.id) as AttendanceStatus | undefined) ?? 'present',
    }))
  return c.json({
    date,
    class: { id: klass.id, name: klass.name },
    saved,
    students: list,
  })
})

ops.put('/teacher/attendance', async (c) => {
  const user = requireUser(getCookie(c, COOKIE))
  const schoolId = requireTeacher(user)
  const body = await c.req.json<{
    classId?: string
    date?: string
    marks?: Array<{ studentId?: string; status?: string }>
  }>()
  if (!body.classId) throw new HTTPException(400, { message: 'Pick a class.' })
  await ownedClass(user.id, schoolId, body.classId)
  const date = body.date || toDateKey(new Date())
  const kids = await enrolledStudents(schoolId, body.classId)
  const allowed = new Set(kids.map((row) => row.id))
  const incoming = body.marks ?? []
  if (incoming.length === 0) {
    throw new HTTPException(400, { message: 'Mark every child before saving.' })
  }
  const rows = incoming.map((item) => {
    if (!item.studentId || !allowed.has(item.studentId) || !item.status || !isStatus(item.status)) {
      throw new HTTPException(400, { message: 'Attendance marks are incomplete.' })
    }
    return {
      schoolId,
      studentId: item.studentId,
      classId: body.classId as string,
      date,
      status: item.status,
      markedBy: user.id,
    }
  })
  await db()
    .insert(attendance)
    .values(rows)
    .onConflictDoUpdate({
      target: [attendance.studentId, attendance.date],
      set: {
        status: sql`excluded.status`,
        markedBy: sql`excluded.marked_by`,
        classId: sql`excluded.class_id`,
      },
    })
  const absentIds = rows.filter((row) => row.status === 'absent').map((row) => row.studentId)
  if (absentIds.length > 0) {
    const { notifyAbsences } = await import('../notify.ts')
    await notifyAbsences(schoolId, absentIds, date)
  }
  return c.json({ ok: true, absent: absentIds.length })
})

ops.get('/teacher/updates', async (c) => {
  const user = requireUser(getCookie(c, COOKIE))
  const schoolId = requireTeacher(user)
  const classId = c.req.query('classId')
  if (!classId) throw new HTTPException(400, { message: 'Pick a class.' })
  const klass = await ownedClass(user.id, schoolId, classId)
  const rows = await db()
    .select()
    .from(dailyUpdates)
    .where(and(eq(dailyUpdates.schoolId, schoolId), eq(dailyUpdates.classId, classId)))
    .orderBy(desc(dailyUpdates.createdAt))
    .limit(20)
  const authors = await db()
    .select({ id: profiles.id, fullName: profiles.fullName })
    .from(profiles)
    .where(eq(profiles.schoolId, schoolId))
  const nameById = new Map(authors.map((row) => [row.id, row.fullName]))
  const childCount = (await enrolledStudents(schoolId, classId)).length
  return c.json({
    class: { id: klass.id, name: klass.name },
    childCount,
    updates: rows.map((row) => ({
      id: row.id,
      body: row.body,
      photoPaths: row.photoPaths,
      createdAt: asDate(row.createdAt).toISOString(),
      timeLabel: timeLabel(row.createdAt),
      authorName: (row.authorId && nameById.get(row.authorId)) || 'Teacher',
    })),
  })
})

ops.post('/teacher/updates', async (c) => {
  const user = requireUser(getCookie(c, COOKIE))
  const schoolId = requireTeacher(user)
  const body = await c.req.json<{ classId?: string; body?: string; photos?: PhotoBody[] }>()
  if (!body.classId) throw new HTTPException(400, { message: 'Pick a class.' })
  await ownedClass(user.id, schoolId, body.classId)
  const text = body.body?.trim() ?? ''
  if (!text) throw new HTTPException(400, { message: 'Write what the class enjoyed today.' })
  const [row] = await db()
    .insert(dailyUpdates)
    .values({
      schoolId,
      classId: body.classId,
      authorId: user.id,
      body: text,
      photoPaths: [],
    })
    .returning()
  if (!row) throw new HTTPException(500, { message: 'Could not save the update.' })
  const photoPaths: string[] = []
  for (const [index, photo] of (body.photos ?? []).entries()) {
    if (!photo.dataBase64 || !photo.contentType || !photo.fileName) continue
    const bytes = decodeBase64File(photo.dataBase64, photo.contentType)
    const path = await saveUpload(
      `updates/${schoolId}/${row.id}/${index}.${extFor(photo.contentType)}`,
      bytes,
    )
    photoPaths.push(path)
  }
  if (photoPaths.length > 0) {
    await db().update(dailyUpdates).set({ photoPaths }).where(eq(dailyUpdates.id, row.id))
  }
  const classKids = await enrolledStudents(schoolId, body.classId)
  const { notifyAnnouncement } = await import('../notify.ts')
  await notifyAnnouncement(
    schoolId,
    classKids.map((kid) => kid.id),
    'Today at school',
    text,
  )
  return c.json({ ok: true, childCount: classKids.length, id: row.id })
})

ops.get('/teacher/photos', async (c) => {
  const user = requireUser(getCookie(c, COOKIE))
  const schoolId = requireTeacher(user)
  const path = c.req.query('path') ?? ''
  if (!path.startsWith(`updates/${schoolId}/`)) {
    throw new HTTPException(404, { message: 'Photo not found.' })
  }
  const bytes = await readUpload(path)
  return new Response(bytes, {
    headers: {
      'Content-Type': contentTypeFor(path),
      'Cache-Control': 'private, max-age=3600',
    },
  })
})

ops.get('/teacher/progress', async (c) => {
  const user = requireUser(getCookie(c, COOKIE))
  const schoolId = requireTeacher(user)
  const classId = c.req.query('classId')
  if (!classId) throw new HTTPException(400, { message: 'Pick a class.' })
  const klass = await ownedClass(user.id, schoolId, classId)
  const [school] = await db().select().from(schools).where(eq(schools.id, schoolId)).limit(1)
  const [year] = await db()
    .select()
    .from(academicYears)
    .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.isCurrent, true)))
    .limit(1)
  const term = await currentTerm(schoolId)
  if (!term || !school) {
    throw new HTTPException(404, { message: 'Add an assessment term before recording progress.' })
  }
  const previous = await previousTerm(schoolId, term)
  const kids = (await enrolledStudents(schoolId, classId)).sort((a, b) => (a.rollNo ?? 99) - (b.rollNo ?? 99))
  const ids = kids.map((row) => row.id)
  const currentRows =
    ids.length === 0
      ? []
      : await db()
          .select()
          .from(assessments)
          .where(and(eq(assessments.schoolId, schoolId), eq(assessments.termId, term.id), inArray(assessments.studentId, ids)))
  const previousRows =
    previous && ids.length > 0
      ? await db()
          .select()
          .from(assessments)
          .where(
            and(eq(assessments.schoolId, schoolId), eq(assessments.termId, previous.id), inArray(assessments.studentId, ids)),
          )
      : []
  const remarkRows =
    ids.length === 0
      ? []
      : await db()
          .select()
          .from(progressRemarks)
          .where(
            and(eq(progressRemarks.schoolId, schoolId), eq(progressRemarks.termId, term.id), inArray(progressRemarks.studentId, ids)),
          )
  const pcts = await attendancePctByStudent(schoolId, ids)
  const currentByStudent = new Map<string, Map<string, number>>()
  for (const row of currentRows) {
    const map = currentByStudent.get(row.studentId) ?? new Map<string, number>()
    map.set(row.area, row.level)
    currentByStudent.set(row.studentId, map)
  }
  const previousByStudent = new Map<string, Map<string, number>>()
  for (const row of previousRows) {
    const map = previousByStudent.get(row.studentId) ?? new Map<string, number>()
    map.set(row.area, row.level)
    previousByStudent.set(row.studentId, map)
  }
  const remarkByStudent = new Map(remarkRows.map((row) => [row.studentId, row.remark]))
  const payload = kids.map((kid) => {
    const current = currentByStudent.get(kid.id) ?? new Map<string, number>()
    const previousMap = previousByStudent.get(kid.id) ?? new Map<string, number>()
    const areas = LEARNING_AREAS.map((area) => {
      const level = current.get(area) ?? 0
      const previousLevel = previousMap.get(area) ?? 0
      return {
        area,
        level,
        previousLevel,
        trend: level && previousLevel ? levelTrend(level, previousLevel) : 'no_change',
      }
    })
    const levels = areas.map((item) => item.level).filter((level) => level > 0)
    const previousLevels = LEARNING_AREAS.map((area) => previousMap.get(area) ?? 0).filter((level) => level > 0)
    const overall = overallLevel(levels)
    const previousOverall = overallLevel(previousLevels)
    return {
      id: kid.id,
      firstName: kid.firstName,
      lastName: kid.lastName,
      rollNo: kid.rollNo,
      admissionNo: kid.admissionNo,
      assessed: levels.length === LEARNING_AREAS.length,
      overall,
      needsSupport: needsSupport(levels),
      improved: previousOverall > 0 && overall > previousOverall,
      attendancePct: pcts.get(kid.id) ?? 0,
      remark: remarkByStudent.get(kid.id) ?? '',
      areas,
    }
  })
  const assessedKids = payload.filter((row) => row.assessed)
  const areaAverages = LEARNING_AREAS.map((area) => {
    const values = assessedKids.map((kid) => kid.areas.find((item) => item.area === area)?.level ?? 0)
    const average = values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length
    return { area, average: Number(average.toFixed(1)) }
  })
  return c.json({
    school: {
      name: school.name,
      address: school.address,
      phone: school.phone,
      email: school.email,
      yearLabel: year?.label ?? '',
    },
    class: { id: klass.id, name: klass.name, teacherName: user.fullName },
    term: { id: term.id, label: term.label },
    previousTerm: previous ? { id: previous.id, label: previous.label } : null,
    assessed: assessedKids.length,
    total: payload.length,
    improved: payload.filter((row) => row.improved).length,
    needSupport: payload.filter((row) => row.needsSupport).length,
    areaAverages,
    students: payload,
  })
})

ops.put('/teacher/progress', async (c) => {
  const user = requireUser(getCookie(c, COOKIE))
  const schoolId = requireTeacher(user)
  const body = await c.req.json<{
    classId?: string
    studentId?: string
    remark?: string
    areas?: Array<{ area?: string; level?: number }>
  }>()
  if (!body.classId || !body.studentId) {
    throw new HTTPException(400, { message: 'Pick a child.' })
  }
  await ownedClass(user.id, schoolId, body.classId)
  const term = await currentTerm(schoolId)
  if (!term) throw new HTTPException(404, { message: 'Add an assessment term before recording progress.' })
  const kids = await enrolledStudents(schoolId, body.classId)
  if (!kids.some((row) => row.id === body.studentId)) {
    throw new HTTPException(403, { message: 'That child is not in your class.' })
  }
  const incoming = body.areas ?? []
  if (incoming.length !== LEARNING_AREAS.length) {
    throw new HTTPException(400, { message: 'Rate every learning area.' })
  }
  const rows = incoming.map((item) => {
    if (!item.area || !isArea(item.area) || !item.level || item.level < 1 || item.level > 4) {
      throw new HTTPException(400, { message: 'Each area needs a level from 1 to 4.' })
    }
    return {
      schoolId,
      studentId: body.studentId as string,
      termId: term.id,
      area: item.area,
      level: item.level,
      assessedBy: user.id,
    }
  })
  await db()
    .insert(assessments)
    .values(rows)
    .onConflictDoUpdate({
      target: [assessments.studentId, assessments.termId, assessments.area],
      set: {
        level: sql`excluded.level`,
        assessedBy: sql`excluded.assessed_by`,
      },
    })
  const remark = body.remark?.trim() ?? ''
  if (remark) {
    await db()
      .insert(progressRemarks)
      .values({
        schoolId,
        studentId: body.studentId,
        termId: term.id,
        remark,
      })
      .onConflictDoUpdate({
        target: [progressRemarks.studentId, progressRemarks.termId],
        set: { remark: sql`excluded.remark` },
      })
  }
  return c.json({ ok: true })
})

ops.get('/reports/attendance', async (c) => {
  const schoolId = requireSchoolAdmin(requireUser(getCookie(c, COOKIE)))
  const periodParam = c.req.query('period') ?? 'week'
  const period = periodParam === 'today' || periodParam === 'month' ? periodParam : 'week'
  const classId = c.req.query('classId') || 'all'
  const range = periodRange(period)
  const days = range.days
  const classRows = await db().select().from(classes).where(eq(classes.schoolId, schoolId))
  const teachers = await db()
    .select({ id: profiles.id, fullName: profiles.fullName })
    .from(profiles)
    .where(and(eq(profiles.schoolId, schoolId), eq(profiles.role, 'teacher')))
  const kids = await enrolledStudents(schoolId)
  const marks = await marksForDays(schoolId, days.length ? days : lastSchoolDays(5))
  const weekDays = lastSchoolDays(5)
  const weekMarks = days === weekDays ? marks : await marksForDays(schoolId, weekDays)
  const selectedClasses = classId === 'all' ? classRows : classRows.filter((row) => row.id === classId)
  const byClass = selectedClasses.map((klass) => {
    const enrolled = kids.filter((row) => row.classId === klass.id)
    const ids = new Set(enrolled.map((row) => row.id))
    if (period === 'today') {
      const today = days[0] ?? toDateKey(new Date())
      const counts = countsForDay(ids, today, marks)
      return {
        id: klass.id,
        name: klass.name,
        teacherName: teachers.find((item) => item.id === klass.teacherId)?.fullName ?? '—',
        children: enrolled.length,
        present: counts.present,
        late: counts.late,
        absent: counts.absent,
        pct: counts.pct,
      }
    }
    let present = 0
    let late = 0
    for (const row of marks) {
      if (!ids.has(row.studentId)) continue
      if (row.status === 'present') present += 1
      if (row.status === 'late') late += 1
    }
    const working = Math.max(1, days.length)
    const presentAvg = Math.round(present / working)
    const lateAvg = Math.round(late / working)
    const enrolledCount = enrolled.length
    const absentAvg = Math.max(0, enrolledCount - presentAvg - lateAvg)
    const pct = attendancePct(present + late, enrolledCount * days.length)
    return {
      id: klass.id,
      name: klass.name,
      teacherName: teachers.find((item) => item.id === klass.teacherId)?.fullName ?? '—',
      children: enrolledCount,
      present: presentAvg,
      late: lateAvg,
      absent: absentAvg,
      pct,
    }
  })
  const totals = byClass.reduce(
    (sum, row) => ({
      present: sum.present + row.present,
      late: sum.late + row.late,
      absent: sum.absent + row.absent,
      children: sum.children + row.children,
    }),
    { present: 0, late: 0, absent: 0, children: 0 },
  )
  const selectedKids = classId === 'all' ? [] : kids.filter((row) => row.classId === classId)
  const studentRows = selectedKids
    .sort((a, b) => (a.rollNo ?? 99) - (b.rollNo ?? 99))
    .map((kid) => {
      const presentDays = marks.filter((row) => row.studentId === kid.id && presentOrLate(row.status)).length
      const today = days[0]
      const todayMark = marks.find((row) => row.studentId === kid.id && row.date === today)
      const pct = studentPct(kid.id, days, marks)
      return {
        id: kid.id,
        firstName: kid.firstName,
        lastName: kid.lastName,
        rollNo: kid.rollNo,
        status: (todayMark?.status as AttendanceStatus | undefined) ?? null,
        presentDays,
        absentDays: Math.max(0, days.length - presentDays),
        workingDays: days.length,
        pct,
      }
    })
  const below75 =
    classId === 'all'
      ? kids.filter((kid) => isLowChild(studentPct(kid.id, days, marks))).length
      : studentRows.filter((row) => isLowChild(row.pct)).length
  const allIds = new Set(
    (classId === 'all' ? kids : selectedKids).map((row) => row.id),
  )
  const week = weekDays.map((day) => ({
    label: new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(
      new Date(Number(day.slice(0, 4)), Number(day.slice(5, 7)) - 1, Number(day.slice(8, 10))),
    ),
    pct: classDayPct(allIds, day, weekMarks),
  }))
  const selectedEnrolled = kids.filter((row) => selectedClasses.some((klass) => klass.id === row.classId))
  const overallPct =
    period === 'today'
      ? attendancePct(totals.present + totals.late, totals.children)
      : attendancePct(
          marks.filter((row) => selectedEnrolled.some((kid) => kid.id === row.studentId) && presentOrLate(row.status))
            .length,
          selectedEnrolled.length * days.length,
        )

  return c.json({
    period,
    periodLabel: periodLabel(period),
    classId,
    classes: classRows.map((row) => ({ id: row.id, name: row.name })),
    stats: {
      pct: overallPct,
      present: totals.present + totals.late,
      late: totals.late,
      absent: totals.absent,
      enrolled: totals.children,
      below75,
    },
    byClass,
    week,
    students: classId === 'all' ? null : studentRows,
  })
})

ops.get('/announcements', async (c) => {
  const user = requireUser(getCookie(c, COOKIE))
  if (!user.schoolId) throw new HTTPException(403, { message: 'School users only.' })
  const rows = await db()
    .select()
    .from(announcements)
    .where(eq(announcements.schoolId, user.schoolId))
    .orderBy(desc(announcements.createdAt))
    .limit(10)
  return c.json({
    announcements: rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      audience: row.audience,
      createdAt: row.createdAt.toISOString(),
    })),
  })
})
