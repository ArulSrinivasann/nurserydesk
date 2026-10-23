import { and, desc, eq, inArray } from 'drizzle-orm'
import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { HTTPException } from 'hono/http-exception'
import { COUNTED } from '../attendance.ts'
import {
  createInvoice,
  dueByStudent,
  hasMonthlyInvoice,
  loadReceipt,
  paidByItem,
  pendingItems,
  recordPayment,
} from '../fees.ts'
import {
  academicYears,
  classes,
  feeTypes,
  guardians,
  invoiceItems,
  invoices,
  paymentItems,
  payments,
  studentGuardians,
  students,
} from '../db/schema.ts'
import { db, requireSchoolAdmin, requireUser } from '../http.ts'
import { discountRate, monthlyFeeAfterDiscount, type DiscountKind } from '../../src/lib/admissions.ts'
import {
  dueOnForMonth,
  isPaymentMethod,
  monthPeriod,
  monthlyFeeDescription,
  remainingPaise,
} from '../../src/lib/fees.ts'

const COOKIE = 'nd_session'

function appliesToClass(classIds: string[], classId: string | null) {
  if (!classId) return false
  if (classIds.length === 0) return true
  return classIds.includes(classId)
}

async function parentName(schoolId: string, studentId: string) {
  const [link] = await db()
    .select({ name: guardians.fullName })
    .from(studentGuardians)
    .innerJoin(guardians, eq(studentGuardians.guardianId, guardians.id))
    .where(and(eq(studentGuardians.schoolId, schoolId), eq(studentGuardians.studentId, studentId)))
    .limit(1)
  return link?.name ?? '—'
}

export const fees = new Hono()

fees.get('/invoices', async (c) => {
  const schoolId = requireSchoolAdmin(requireUser(getCookie(c, COOKIE)))
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const rows = await db()
    .select()
    .from(invoices)
    .where(eq(invoices.schoolId, schoolId))
    .orderBy(desc(invoices.issuedOn), desc(invoices.number))
  const kids = await db().select().from(students).where(eq(students.schoolId, schoolId))
  const payRows = await db().select().from(payments).where(eq(payments.schoolId, schoolId))
  const items = await db().select().from(invoiceItems).where(eq(invoiceItems.schoolId, schoolId))
  const paid = await paidByItem(
    schoolId,
    items.map((row) => row.id),
  )
  const remainingByInvoice = new Map<string, number>()
  for (const item of items) {
    const left = remainingPaise(item.amountPaise, paid.get(item.id) ?? 0)
    remainingByInvoice.set(item.invoiceId, (remainingByInvoice.get(item.invoiceId) ?? 0) + left)
  }
  const billed = rows.filter((row) => row.issuedOn >= monthStart).reduce((sum, row) => sum + row.totalPaise, 0)
  const collected = payRows.filter((row) => row.paidOn >= monthStart).reduce((sum, row) => sum + row.totalPaise, 0)
  const outstanding = rows.reduce((sum, row) => sum + (remainingByInvoice.get(row.id) ?? 0), 0)
  const overdue = rows.filter((row) => row.status === 'overdue').length
  const paymentByInvoice = new Map<string, string>()
  const payItems = await db().select().from(paymentItems).where(eq(paymentItems.schoolId, schoolId))
  const paymentIds = [...new Set(payItems.map((row) => row.paymentId))]
  const paymentRows =
    paymentIds.length === 0
      ? []
      : await db().select().from(payments).where(inArray(payments.id, paymentIds))
  for (const item of payItems) {
    const invoiceId = items.find((row) => row.id === item.invoiceItemId)?.invoiceId
    const payment = paymentRows.find((row) => row.id === item.paymentId)
    if (invoiceId && payment && !paymentByInvoice.has(invoiceId)) {
      paymentByInvoice.set(invoiceId, payment.id)
    }
  }
  return c.json({
    monthLabel: new Intl.DateTimeFormat('en-IN', { month: 'long' }).format(now),
    stats: {
      billed,
      collected,
      outstanding,
      overdue,
      collectedPct: billed === 0 ? 0 : Math.round((collected / billed) * 100),
    },
    invoices: rows.map((row) => {
      const child = kids.find((item) => item.id === row.studentId)
      return {
        id: row.id,
        number: row.number,
        studentId: row.studentId,
        firstName: child?.firstName ?? 'Child',
        lastName: child?.lastName ?? null,
        amountPaise: row.totalPaise,
        remainingPaise: remainingByInvoice.get(row.id) ?? 0,
        status: row.status,
        issuedOn: row.issuedOn,
        dueOn: row.dueOn,
        paymentId: row.status === 'paid' ? (paymentByInvoice.get(row.id) ?? null) : null,
      }
    }),
  })
})

fees.post('/invoices/generate', async (c) => {
  const schoolId = requireSchoolAdmin(requireUser(getCookie(c, COOKIE)))
  const now = new Date()
  const period = monthPeriod(now)
  const kids = await db()
    .select()
    .from(students)
    .where(and(eq(students.schoolId, schoolId), inArray(students.status, COUNTED)))
  const classRows = await db().select().from(classes).where(eq(classes.schoolId, schoolId))
  let created = 0
  for (const kid of kids) {
    if (!kid.classId) continue
    if (await hasMonthlyInvoice(kid.id, period)) continue
    const klass = classRows.find((row) => row.id === kid.classId)
    if (!klass) continue
    const monthly = monthlyFeeAfterDiscount(
      klass.monthlyFeePaise,
      discountRate((kid.discountKind as DiscountKind) ?? 'none'),
    )
    await createInvoice({
      schoolId,
      studentId: kid.id,
      kind: 'monthly',
      period,
      dueOn: dueOnForMonth(now),
      items: [
        {
          description: monthlyFeeDescription(now),
          amountPaise: monthly,
          discountPaise: klass.monthlyFeePaise - monthly,
          kind: 'monthly',
          period,
        },
      ],
    })
    created += 1
  }
  return c.json({ created, period, monthLabel: new Intl.DateTimeFormat('en-IN', { month: 'long' }).format(now) })
})

fees.get('/fee-types', async (c) => {
  const schoolId = requireSchoolAdmin(requireUser(getCookie(c, COOKIE)))
  const types = await db().select().from(feeTypes).where(eq(feeTypes.schoolId, schoolId))
  const classRows = await db().select().from(classes).where(eq(classes.schoolId, schoolId))
  const kids = await db()
    .select()
    .from(students)
    .where(and(eq(students.schoolId, schoolId), inArray(students.status, COUNTED)))
  const items = await db().select().from(invoiceItems).where(eq(invoiceItems.schoolId, schoolId))
  const paid = await paidByItem(
    schoolId,
    items.map((row) => row.id),
  )
  const extraItems = items.filter((row) => row.kind === 'other')
  const extraCollected = extraItems.reduce(
    (sum, row) => sum + Math.min(row.amountPaise, paid.get(row.id) ?? 0),
    0,
  )
  const still = extraItems.reduce((sum, row) => sum + remainingPaise(row.amountPaise, paid.get(row.id) ?? 0), 0)
  return c.json({
    stats: {
      extraCollected,
      stillToCollect: still,
      childrenStill: new Set(
        extraItems.filter((row) => remainingPaise(row.amountPaise, paid.get(row.id) ?? 0) > 0).map((row) => row.studentId),
      ).size,
      typeCount: types.length,
    },
    feeTypes: types.map((row) => {
      const eligible = kids.filter((kid) => appliesToClass(row.appliesToClassIds, kid.classId))
      const related = items.filter((item) => item.feeTypeId === row.id)
      const paidCount = related.filter((item) => remainingPaise(item.amountPaise, paid.get(item.id) ?? 0) === 0).length
      const classNames =
        row.appliesToClassIds.length === 0
          ? 'All classes'
          : row.appliesToClassIds
              .map((id) => classRows.find((klass) => klass.id === id)?.name)
              .filter(Boolean)
              .join(', ')
      return {
        id: row.id,
        name: row.name,
        amountPaise: row.amountPaise,
        appliesTo: classNames || 'All classes',
        isMandatory: row.isMandatory,
        dueOn: row.dueOn,
        recurring: row.recurring,
        paidCount,
        eligibleCount: eligible.length,
      }
    }),
    classes: classRows.map((row) => ({ id: row.id, name: row.name })),
  })
})

fees.post('/fee-types', async (c) => {
  const schoolId = requireSchoolAdmin(requireUser(getCookie(c, COOKIE)))
  const body = await c.req.json<{
    name?: string
    amountPaise?: number
    appliesToClassIds?: string[]
    isMandatory?: boolean
    dueOn?: string
    recurring?: string
  }>()
  const name = body.name?.trim() ?? ''
  const amountPaise = Math.round(Number(body.amountPaise))
  if (!name || !Number.isFinite(amountPaise) || amountPaise <= 0) {
    throw new HTTPException(400, { message: 'Enter a fee name and amount.' })
  }
  const [row] = await db()
    .insert(feeTypes)
    .values({
      schoolId,
      name,
      amountPaise,
      appliesToClassIds: body.appliesToClassIds ?? [],
      isMandatory: Boolean(body.isMandatory),
      dueOn: body.dueOn || null,
      recurring: body.recurring === 'monthly' ? 'monthly' : 'none',
    })
    .returning()
  if (!row) throw new HTTPException(500, { message: 'Could not create the fee.' })
  const kids = await db()
    .select()
    .from(students)
    .where(and(eq(students.schoolId, schoolId), inArray(students.status, COUNTED)))
  const dueOn = row.dueOn || dueOnForMonth(new Date())
  for (const kid of kids) {
    if (!appliesToClass(row.appliesToClassIds, kid.classId)) continue
    await createInvoice({
      schoolId,
      studentId: kid.id,
      kind: 'other',
      dueOn,
      items: [
        {
          feeTypeId: row.id,
          description: row.name,
          amountPaise: row.amountPaise,
          kind: 'other',
        },
      ],
    })
  }
  return c.json({ feeType: row })
})

fees.get('/payments/students', async (c) => {
  const schoolId = requireSchoolAdmin(requireUser(getCookie(c, COOKIE)))
  const classId = c.req.query('classId') || 'all'
  const query = (c.req.query('q') ?? '').trim().toLowerCase()
  const classRows = await db().select().from(classes).where(eq(classes.schoolId, schoolId))
  const kids = await db()
    .select()
    .from(students)
    .where(and(eq(students.schoolId, schoolId), inArray(students.status, COUNTED)))
  const dues = await dueByStudent(
    schoolId,
    kids.map((row) => row.id),
  )
  const rollQuery = query.replace(/^0+/, '')
  const list = kids
    .filter((row) => (classId === 'all' ? true : row.classId === classId))
    .filter((row) => {
      if (!query) return true
      const name = `${row.firstName} ${row.lastName ?? ''}`.toLowerCase()
      const roll = String(row.rollNo ?? '')
      return (
        name.includes(query) ||
        roll === query ||
        roll === rollQuery ||
        row.admissionNo.toLowerCase().includes(query)
      )
    })
    .sort((a, b) => {
      const classA = classRows.find((row) => row.id === a.classId)?.name ?? ''
      const classB = classRows.find((row) => row.id === b.classId)?.name ?? ''
      if (classA !== classB) return classA.localeCompare(classB)
      return (a.rollNo ?? 0) - (b.rollNo ?? 0)
    })
    .map((row) => ({
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      className: classRows.find((item) => item.id === row.classId)?.name ?? 'Unassigned',
      rollNo: row.rollNo,
      admissionNo: row.admissionNo,
      duePaise: dues.get(row.id) ?? 0,
    }))
  return c.json({
    classes: classRows.map((row) => ({ id: row.id, name: row.name })),
    students: list,
  })
})

fees.get('/payments/pending', async (c) => {
  const schoolId = requireSchoolAdmin(requireUser(getCookie(c, COOKIE)))
  const studentId = c.req.query('studentId')
  if (!studentId) throw new HTTPException(400, { message: 'Pick a child.' })
  const [student] = await db()
    .select()
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
    .limit(1)
  if (!student) throw new HTTPException(404, { message: 'Student not found.' })
  const [klass] = student.classId
    ? await db().select().from(classes).where(eq(classes.id, student.classId)).limit(1)
    : []
  const [year] = await db()
    .select()
    .from(academicYears)
    .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.isCurrent, true)))
    .limit(1)
  const pending = await pendingItems(schoolId, studentId)
  return c.json({
    student: {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      className: klass?.name ?? 'Unassigned',
      rollNo: student.rollNo,
      admissionNo: student.admissionNo,
      parentName: await parentName(schoolId, student.id),
      yearLabel: year?.label ?? '',
    },
    items: pending,
  })
})

fees.post('/payments', async (c) => {
  const user = requireUser(getCookie(c, COOKIE))
  const schoolId = requireSchoolAdmin(user)
  const body = await c.req.json<{
    studentId?: string
    method?: string
    reference?: string
    itemIds?: string[]
  }>()
  if (!body.studentId) throw new HTTPException(400, { message: 'Pick a child.' })
  if (!body.method || !isPaymentMethod(body.method)) {
    throw new HTTPException(400, { message: 'Choose how they paid.' })
  }
  if (body.method === 'Cheque' && !body.reference?.trim()) {
    throw new HTTPException(400, { message: 'Enter the cheque number.' })
  }
  const result = await recordPayment({
    schoolId,
    studentId: body.studentId,
    method: body.method,
    reference: body.reference,
    itemIds: body.itemIds ?? [],
    receivedBy: user.id,
  })
  return c.json({ paymentId: result.paymentId, receiptNo: result.receiptNo })
})

fees.get('/payments/:id', async (c) => {
  const schoolId = requireSchoolAdmin(requireUser(getCookie(c, COOKIE)))
  const receipt = await loadReceipt(schoolId, c.req.param('id'))
  if (!receipt) throw new HTTPException(404, { message: 'Receipt not found.' })
  return c.json(receipt)
})
