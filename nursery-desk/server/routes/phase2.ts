import {
  DOC_KINDS,
  ENQUIRY_SOURCES,
  ENQUIRY_STATUSES,
  GENDERS,
  deriveAdmissionPrefix,
  discountRate,
  enrolmentStatus,
  formatAdmissionNo,
  nextAdmissionSeq,
  type DiscountKind,
  type DocKind,
  type EnquirySource,
  type EnquiryStatus,
  type Gender,
} from '../../src/lib/admissions.ts'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { HTTPException } from 'hono/http-exception'
import {
  academicYears,
  classes,
  enquiries,
  enquiryNotes,
  guardians,
  plans,
  profiles,
  schools,
  studentDocuments,
  studentGuardians,
  students,
} from '../db/schema.ts'
import { attendancePctByStudent } from '../attendance.ts'
import { createFirstInvoice, dueByStudent } from '../fees.ts'
import { db, requireSchoolAdmin, requireUser } from '../http.ts'
import { decodeBase64File, readUpload, saveUpload } from '../uploads.ts'

const COOKIE = 'nd_session'
const OPEN_STATUSES: EnquiryStatus[] = ['New', 'Follow-up', 'Visit booked']
const COUNTED_STATUSES = ['applied', 'documents_pending', 'enrolled', 'ready']

type EnrolBody = {
  enquiryId?: string
  firstName?: string
  lastName?: string
  dob?: string
  gender?: Gender
  medicalNotes?: string
  parentName?: string
  phone?: string
  email?: string
  relationship?: string
  address?: string
  emergencyContact?: string
  classId?: string
  discountKind?: DiscountKind
  documents?: Array<{
    kind?: DocKind
    fileName?: string
    contentType?: string
    dataBase64?: string
  }>
}

function isEnquiryStatus(value: string): value is EnquiryStatus {
  return (ENQUIRY_STATUSES as readonly string[]).includes(value)
}

function isEnquirySource(value: string): value is EnquirySource {
  return (ENQUIRY_SOURCES as readonly string[]).includes(value)
}

function isGender(value: string): value is Gender {
  return (GENDERS as readonly string[]).includes(value)
}

function isDiscount(value: string): value is DiscountKind {
  return value === 'none' || value === 'sibling' || value === 'staff'
}

function isDocKind(value: string): value is DocKind {
  return DOC_KINDS.some((doc) => doc.id === value)
}

function startOfToday() {
  const date = new Date()
  date.setHours(9, 0, 0, 0)
  return date
}

function followUpLabel(value: Date | string | null) {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  const today = startOfToday()
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  if (sameDay) return 'Today'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(date)
}

async function countedInClass(schoolId: string, classId: string) {
  const rows = await db()
    .select({ id: students.id })
    .from(students)
    .where(
      and(
        eq(students.schoolId, schoolId),
        eq(students.classId, classId),
        inArray(students.status, COUNTED_STATUSES),
      ),
    )
  return rows.length
}

export const phase2 = new Hono()

phase2.get('/enquiries', async (c) => {
  const schoolId = requireSchoolAdmin(requireUser(getCookie(c, COOKIE)))
  const rows = await db()
    .select()
    .from(enquiries)
    .where(eq(enquiries.schoolId, schoolId))
    .orderBy(desc(enquiries.nextFollowUpAt), desc(enquiries.id))
  const notes = await db()
    .select({
      id: enquiryNotes.id,
      enquiryId: enquiryNotes.enquiryId,
      note: enquiryNotes.note,
      createdAt: enquiryNotes.createdAt,
      authorName: profiles.fullName,
    })
    .from(enquiryNotes)
    .leftJoin(profiles, eq(enquiryNotes.authorId, profiles.id))
    .where(eq(enquiryNotes.schoolId, schoolId))
    .orderBy(desc(enquiryNotes.createdAt))

  const list = rows.map((row) => ({
    ...row,
    followUpLabel: followUpLabel(row.nextFollowUpAt),
    notes: notes
      .filter((note) => note.enquiryId === row.id)
      .map((note) => ({
        id: note.id,
        note: note.note,
        createdAt: note.createdAt,
        authorName: note.authorName ?? 'Staff',
      })),
  }))

  const count = (status: EnquiryStatus) => list.filter((row) => row.status === status).length
  const open = OPEN_STATUSES.reduce((sum, status) => sum + count(status), 0)
  const dueToday = list.filter((row) => row.followUpLabel === 'Today' && OPEN_STATUSES.includes(row.status as EnquiryStatus)).length
  const converted = count('Converted')

  return c.json({
    enquiries: list,
    stats: {
      open,
      dueToday,
      visitsBooked: count('Visit booked'),
      converted,
      conversionPct: list.length ? Math.round((converted / list.length) * 100) : 0,
      total: list.length,
    },
  })
})

phase2.post('/enquiries', async (c) => {
  const user = requireUser(getCookie(c, COOKIE))
  const schoolId = requireSchoolAdmin(user)
  const body = await c.req.json<{
    childName?: string
    parentName?: string
    phone?: string
    classInterest?: string
    source?: string
    notes?: string
  }>()
  const childName = body.childName?.trim() ?? ''
  const parentName = body.parentName?.trim() ?? ''
  const phone = body.phone?.trim() ?? ''
  const source = body.source?.trim() ?? ''
  if (!childName || !parentName || !phone) {
    throw new HTTPException(400, { message: 'Enter the child’s name, parent’s name and phone number.' })
  }
  if (!isEnquirySource(source)) {
    throw new HTTPException(400, { message: 'Pick how they heard about the school.' })
  }
  const [row] = await db()
    .insert(enquiries)
    .values({
      schoolId,
      childName,
      parentName,
      phone,
      classInterest: body.classInterest?.trim() || null,
      source,
      status: 'New',
      nextFollowUpAt: startOfToday(),
    })
    .returning()
  const note = body.notes?.trim()
  if (row && note) {
    await db().insert(enquiryNotes).values({
      schoolId,
      enquiryId: row.id,
      authorId: user.id,
      note,
    })
  } else if (row) {
    await db().insert(enquiryNotes).values({
      schoolId,
      enquiryId: row.id,
      authorId: user.id,
      note: 'Enquiry added',
    })
  }
  return c.json({ enquiry: row })
})

phase2.patch('/enquiries/:id', async (c) => {
  const schoolId = requireSchoolAdmin(requireUser(getCookie(c, COOKIE)))
  const id = c.req.param('id')
  const body = await c.req.json<{ status?: string; lostReason?: string }>()
  const status = body.status?.trim() ?? ''
  if (!isEnquiryStatus(status)) {
    throw new HTTPException(400, { message: 'Pick a valid status.' })
  }
  const closed = status === 'Converted' || status === 'Lost'
  const [row] = await db()
    .update(enquiries)
    .set({
      status,
      nextFollowUpAt: closed ? null : undefined,
      lostReason: status === 'Lost' ? body.lostReason?.trim() || null : null,
    })
    .where(and(eq(enquiries.id, id), eq(enquiries.schoolId, schoolId)))
    .returning()
  if (!row) {
    throw new HTTPException(404, { message: 'Enquiry not found.' })
  }
  return c.json({ enquiry: row })
})

phase2.post('/enquiries/:id/notes', async (c) => {
  const user = requireUser(getCookie(c, COOKIE))
  const schoolId = requireSchoolAdmin(user)
  const id = c.req.param('id')
  const body = await c.req.json<{ note?: string }>()
  const note = body.note?.trim() ?? ''
  if (!note) {
    throw new HTTPException(400, { message: 'Write a note first.' })
  }
  const [enquiry] = await db()
    .select()
    .from(enquiries)
    .where(and(eq(enquiries.id, id), eq(enquiries.schoolId, schoolId)))
    .limit(1)
  if (!enquiry) {
    throw new HTTPException(404, { message: 'Enquiry not found.' })
  }
  await db().insert(enquiryNotes).values({
    schoolId,
    enquiryId: id,
    authorId: user.id,
    note,
  })
  if (enquiry.status === 'New') {
    await db()
      .update(enquiries)
      .set({ status: 'Follow-up' })
      .where(eq(enquiries.id, id))
  }
  return c.json({ ok: true })
})

phase2.post('/enquiries/:id/visit', async (c) => {
  const user = requireUser(getCookie(c, COOKIE))
  const schoolId = requireSchoolAdmin(user)
  const id = c.req.param('id')
  const when = new Date()
  when.setDate(when.getDate() + 4)
  when.setHours(10, 30, 0, 0)
  const [row] = await db()
    .update(enquiries)
    .set({ status: 'Visit booked', nextFollowUpAt: when })
    .where(and(eq(enquiries.id, id), eq(enquiries.schoolId, schoolId)))
    .returning()
  if (!row) {
    throw new HTTPException(404, { message: 'Enquiry not found.' })
  }
  await db().insert(enquiryNotes).values({
    schoolId,
    enquiryId: id,
    authorId: user.id,
    note: `School visit booked for ${followUpLabel(when)}, 10:30.`,
  })
  return c.json({ enquiry: row })
})

phase2.get('/admissions/options', async (c) => {
  const schoolId = requireSchoolAdmin(requireUser(getCookie(c, COOKIE)))
  const [school] = await db().select().from(schools).where(eq(schools.id, schoolId)).limit(1)
  if (!school) {
    throw new HTTPException(404, { message: 'School not found.' })
  }
  const [plan] = await db().select().from(plans).where(eq(plans.id, school.planId)).limit(1)
  const [year] = await db()
    .select()
    .from(academicYears)
    .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.isCurrent, true)))
    .limit(1)
  const classRows = await db().select().from(classes).where(eq(classes.schoolId, schoolId))
  const teachers = await db()
    .select({ id: profiles.id, fullName: profiles.fullName })
    .from(profiles)
    .where(and(eq(profiles.schoolId, schoolId), eq(profiles.role, 'teacher')))
  const enrolled = await db()
    .select({ classId: students.classId, n: sql<number>`count(*)::int` })
    .from(students)
    .where(and(eq(students.schoolId, schoolId), inArray(students.status, COUNTED_STATUSES)))
    .groupBy(students.classId)
  const enrolledByClass = new Map(enrolled.map((row) => [row.classId, Number(row.n)]))
  const childCount = [...enrolledByClass.values()].reduce((sum, n) => sum + n, 0)

  return c.json({
    school: {
      admissionFeePaise: school.admissionFeePaise,
      admissionPrefix: school.admissionPrefix || deriveAdmissionPrefix(school.name),
      childLimit: plan?.childLimit ?? null,
      childCount,
      yearLabel: year?.label ?? 'Academic year not set',
      yearStart: year ? new Date(year.startsOn).getFullYear() : new Date().getFullYear(),
    },
    classes: classRows.map((row) => {
      const taken = enrolledByClass.get(row.id) ?? 0
      return {
        id: row.id,
        name: row.name,
        ageRange: row.ageRange,
        capacity: row.capacity,
        enrolled: taken,
        seatsLeft: Math.max(0, row.capacity - taken),
        monthlyFeePaise: row.monthlyFeePaise,
        teacherName: teachers.find((item) => item.id === row.teacherId)?.fullName ?? null,
      }
    }),
  })
})

phase2.get('/admissions/board', async (c) => {
  const schoolId = requireSchoolAdmin(requireUser(getCookie(c, COOKIE)))
  const openEnquiries = await db()
    .select()
    .from(enquiries)
    .where(and(eq(enquiries.schoolId, schoolId), inArray(enquiries.status, OPEN_STATUSES)))
  const pipeline = await db()
    .select()
    .from(students)
    .where(and(eq(students.schoolId, schoolId), inArray(students.status, ['applied', 'documents_pending', 'ready'])))
  const classRows = await db().select({ id: classes.id, name: classes.name }).from(classes).where(eq(classes.schoolId, schoolId))
  const className = (id: string | null) => classRows.find((row) => row.id === id)?.name ?? 'Unassigned'

  return c.json({
    columns: {
      enquiries: openEnquiries.map((row) => ({
        id: row.id,
        title: row.childName,
        subtitle: `${row.classInterest ?? 'Class not set'} · ${row.source}`,
        kind: 'enquiry' as const,
      })),
      applied: pipeline
        .filter((row) => row.status === 'applied')
        .map((row) => ({
          id: row.id,
          title: `${row.firstName} ${row.lastName ?? ''}`.trim(),
          subtitle: className(row.classId),
          kind: 'student' as const,
        })),
      documentsPending: pipeline
        .filter((row) => row.status === 'documents_pending')
        .map((row) => ({
          id: row.id,
          title: `${row.firstName} ${row.lastName ?? ''}`.trim(),
          subtitle: className(row.classId),
          kind: 'student' as const,
        })),
      ready: pipeline
        .filter((row) => row.status === 'ready')
        .map((row) => ({
          id: row.id,
          title: `${row.firstName} ${row.lastName ?? ''}`.trim(),
          subtitle: className(row.classId),
          kind: 'student' as const,
        })),
    },
    openCount: openEnquiries.length + pipeline.length,
  })
})

phase2.post('/admissions', async (c) => {
  const user = requireUser(getCookie(c, COOKIE))
  const schoolId = requireSchoolAdmin(user)
  const body = await c.req.json<EnrolBody>()
  const firstName = body.firstName?.trim() ?? ''
  const parentName = body.parentName?.trim() ?? ''
  const phone = body.phone?.trim() ?? ''
  const classId = body.classId ?? ''
  const gender = body.gender ?? 'Girl'
  const discountKind = body.discountKind ?? 'none'
  if (!firstName) {
    throw new HTTPException(400, { message: 'Enter the child’s first name to continue.' })
  }
  if (!parentName || !phone) {
    throw new HTTPException(400, { message: 'Enter the parent’s name and phone number.' })
  }
  if (!isGender(gender) || !isDiscount(discountKind) || !classId) {
    throw new HTTPException(400, { message: 'Pick a class, gender and discount.' })
  }

  const [school] = await db().select().from(schools).where(eq(schools.id, schoolId)).limit(1)
  const [klass] = await db()
    .select()
    .from(classes)
    .where(and(eq(classes.id, classId), eq(classes.schoolId, schoolId)))
    .limit(1)
  if (!school || !klass) {
    throw new HTTPException(400, { message: 'Pick a class in this school.' })
  }
  const [plan] = await db().select().from(plans).where(eq(plans.id, school.planId)).limit(1)
  const [year] = await db()
    .select()
    .from(academicYears)
    .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.isCurrent, true)))
    .limit(1)
  const taken = await countedInClass(schoolId, classId)
  if (taken >= klass.capacity) {
    throw new HTTPException(400, { message: 'That class is full. Pick another class.' })
  }
  const schoolHeadcount = (
    await db()
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.schoolId, schoolId), inArray(students.status, COUNTED_STATUSES)))
  ).length
  if (plan?.childLimit && schoolHeadcount >= plan.childLimit) {
    throw new HTTPException(400, {
      message: 'This school has reached its plan limit. Upgrade the plan to admit another child.',
    })
  }

  const existingNos = (
    await db().select({ admissionNo: students.admissionNo }).from(students).where(eq(students.schoolId, schoolId))
  ).map((row) => row.admissionNo)
  const yearStart = year ? new Date(year.startsOn).getFullYear() : new Date().getFullYear()
  const prefix = school.admissionPrefix || deriveAdmissionPrefix(school.name)
  const admissionNo = formatAdmissionNo(prefix, yearStart, nextAdmissionSeq(existingNos, prefix, yearStart))
  const rolls = (
    await db()
      .select({ rollNo: students.rollNo })
      .from(students)
      .where(and(eq(students.schoolId, schoolId), eq(students.classId, classId)))
  )
    .map((row) => row.rollNo ?? 0)
  const rollNo = Math.max(0, ...rolls) + 1
  const docs = (body.documents ?? []).filter(
    (doc): doc is { kind: DocKind; fileName: string; contentType: string; dataBase64: string } =>
      Boolean(doc.kind && isDocKind(doc.kind) && doc.fileName && doc.contentType && doc.dataBase64),
  )
  const status = enrolmentStatus(docs.map((doc) => doc.kind))

  const [student] = await db()
    .insert(students)
    .values({
      schoolId,
      admissionNo,
      firstName,
      lastName: body.lastName?.trim() || null,
      dob: body.dob ? new Date(body.dob) : null,
      gender,
      medicalNotes: body.medicalNotes?.trim() || null,
      classId,
      rollNo,
      status,
      admittedOn: new Date(),
      discountKind,
    })
    .returning()
  if (!student) {
    throw new HTTPException(500, { message: 'Could not enrol the child.' })
  }

  const [guardian] = await db()
    .insert(guardians)
    .values({
      schoolId,
      fullName: parentName,
      phone,
      email: body.email?.trim() || null,
      relationship: body.relationship?.trim() || null,
      address: body.address?.trim() || null,
      emergencyContact: body.emergencyContact?.trim() || null,
    })
    .returning()
  if (guardian) {
    await db().insert(studentGuardians).values({
      schoolId,
      studentId: student.id,
      guardianId: guardian.id,
    })
  }

  for (const doc of docs) {
    try {
      const bytes = decodeBase64File(doc.dataBase64, doc.contentType)
      const relative = `${schoolId}/${student.id}/${doc.kind}`
      await saveUpload(relative, bytes)
      await db().insert(studentDocuments).values({
        schoolId,
        studentId: student.id,
        kind: doc.kind,
        filePath: relative,
        fileName: doc.fileName,
        contentType: doc.contentType,
      })
    } catch (error) {
      throw new HTTPException(400, {
        message: error instanceof Error ? error.message : 'Could not save a document.',
      })
    }
  }

  if (body.enquiryId) {
    await db()
      .update(enquiries)
      .set({
        status: 'Converted',
        convertedStudentId: student.id,
        nextFollowUpAt: null,
      })
      .where(and(eq(enquiries.id, body.enquiryId), eq(enquiries.schoolId, schoolId)))
    await db().insert(enquiryNotes).values({
      schoolId,
      enquiryId: body.enquiryId,
      authorId: user.id,
      note: 'Converted to admission',
    })
  }

  await createFirstInvoice({
    schoolId,
    studentId: student.id,
    classMonthlyPaise: klass.monthlyFeePaise,
    discountKind,
  })

  return c.json({
    student: {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      admissionNo: student.admissionNo,
      status: student.status,
      parentName,
      monthlyFeePaise: klass.monthlyFeePaise,
      firstInvoicePaise:
        school.admissionFeePaise + Math.round(klass.monthlyFeePaise * (1 - discountRate(discountKind))),
    },
  })
})

phase2.get('/students', async (c) => {
  const schoolId = requireSchoolAdmin(requireUser(getCookie(c, COOKIE)))
  const [year] = await db()
    .select()
    .from(academicYears)
    .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.isCurrent, true)))
    .limit(1)
  const classRows = await db().select().from(classes).where(eq(classes.schoolId, schoolId))
  const teachers = await db()
    .select({ id: profiles.id, fullName: profiles.fullName })
    .from(profiles)
    .where(and(eq(profiles.schoolId, schoolId), eq(profiles.role, 'teacher')))
  const rows = await db().select().from(students).where(eq(students.schoolId, schoolId))
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
  for (const row of rows) {
    if (row.classId && COUNTED_STATUSES.includes(row.status)) {
      enrolledByClass.set(row.classId, (enrolledByClass.get(row.classId) ?? 0) + 1)
    }
  }
  const pcts = await attendancePctByStudent(
    schoolId,
    rows.map((row) => row.id),
  )
  const dues = await dueByStudent(
    schoolId,
    rows.map((row) => row.id),
  )

  return c.json({
    yearLabel: year?.label ?? 'Academic year not set',
    classes: classRows.map((row) => ({
      id: row.id,
      name: row.name,
      teacherName: teachers.find((item) => item.id === row.teacherId)?.fullName ?? null,
      capacity: row.capacity,
      childCount: enrolledByClass.get(row.id) ?? 0,
    })),
    students: rows.map((row) => ({
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      admissionNo: row.admissionNo,
      rollNo: row.rollNo,
      classId: row.classId,
      className: classRows.find((item) => item.id === row.classId)?.name ?? 'Unassigned',
      parentName: parentByStudent.get(row.id) ?? '—',
      status: row.status,
      attendancePct: pcts.get(row.id) ?? null,
      feeDuePaise: dues.get(row.id) ?? 0,
    })),
  })
})

phase2.get('/student-documents/:id', async (c) => {
  const schoolId = requireSchoolAdmin(requireUser(getCookie(c, COOKIE)))
  const id = c.req.param('id')
  const [doc] = await db()
    .select()
    .from(studentDocuments)
    .where(and(eq(studentDocuments.id, id), eq(studentDocuments.schoolId, schoolId)))
    .limit(1)
  if (!doc) {
    throw new HTTPException(404, { message: 'Document not found.' })
  }
  const bytes = await readUpload(doc.filePath)
  return new Response(bytes, {
    headers: {
      'Content-Type': doc.contentType,
      'Content-Disposition': `inline; filename="${doc.fileName}"`,
    },
  })
})
