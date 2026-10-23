import { and, eq, inArray, sql } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import {
  discountRate,
  monthlyFeeAfterDiscount,
  type DiscountKind,
} from '../src/lib/admissions.ts'
import {
  dueOnForMonth,
  formatInvoiceNumber,
  formatReceiptNumber,
  monthPeriod,
  monthlyFeeDescription,
  remainingPaise,
  seqPeriod,
} from '../src/lib/fees.ts'
import { amountInWords, formatINR } from '../src/lib/money.ts'
import {
  academicYears,
  classes,
  feeTypes,
  guardians,
  invoices,
  invoiceItems,
  paymentItems,
  payments,
  profiles,
  schools,
  studentGuardians,
  students,
} from './db/schema.ts'
import { db } from './http.ts'
import { notifyReceipt } from './notify.ts'

function readSeq(result: unknown) {
  if (Array.isArray(result)) {
    return Number((result[0] as { n?: number } | undefined)?.n)
  }
  const rows = (result as { rows?: Array<{ n: number }> }).rows
  return Number(rows?.[0]?.n)
}

export async function nextSeq(schoolId: string, kind: 'invoice' | 'receipt', at = new Date()) {
  const period = seqPeriod(kind, at)
  const result = await db().execute(
    sql`select next_school_seq(${schoolId}::uuid, ${kind}, ${period}) as n`,
  )
  const seq = readSeq(result)
  if (!Number.isFinite(seq) || seq < 1) {
    throw new HTTPException(500, { message: 'Could not issue the next number.' })
  }
  return kind === 'invoice' ? formatInvoiceNumber(seq, at) : formatReceiptNumber(seq, at)
}

export async function refreshInvoiceStatus(invoiceId: string) {
  await db().execute(sql`select refresh_invoice_status(${invoiceId}::uuid)`)
}

export type NewInvoiceItem = {
  feeTypeId?: string | null
  description: string
  amountPaise: number
  discountPaise?: number
  kind: 'admission' | 'monthly' | 'other'
  period?: string | null
}

export async function createInvoice(input: {
  schoolId: string
  studentId: string
  kind: 'admission' | 'monthly' | 'other'
  period?: string | null
  dueOn: string
  items: NewInvoiceItem[]
  issuedOn?: string
}) {
  const issuedOn = input.issuedOn ?? new Date().toISOString().slice(0, 10)
  const totalPaise = input.items.reduce((sum, item) => sum + item.amountPaise, 0)
  const number = await nextSeq(input.schoolId, 'invoice', new Date(`${issuedOn}T00:00:00`))
  const [invoice] = await db()
    .insert(invoices)
    .values({
      schoolId: input.schoolId,
      studentId: input.studentId,
      number,
      issuedOn,
      dueOn: input.dueOn,
      status: 'due',
      totalPaise,
      kind: input.kind,
      period: input.period ?? null,
    })
    .returning()
  if (!invoice) {
    throw new HTTPException(500, { message: 'Could not create the invoice.' })
  }
  const rows = await db()
    .insert(invoiceItems)
    .values(
      input.items.map((item) => ({
        schoolId: input.schoolId,
        invoiceId: invoice.id,
        studentId: input.studentId,
        feeTypeId: item.feeTypeId ?? null,
        description: item.description,
        amountPaise: item.amountPaise,
        discountPaise: item.discountPaise ?? 0,
        kind: item.kind,
        period: item.period ?? null,
      })),
    )
    .returning()
  await refreshInvoiceStatus(invoice.id)
  return { invoice, items: rows }
}

export async function createFirstInvoice(input: {
  schoolId: string
  studentId: string
  classMonthlyPaise: number
  discountKind: DiscountKind
}) {
  const [school] = await db().select().from(schools).where(eq(schools.id, input.schoolId)).limit(1)
  if (!school) return
  const now = new Date()
  const period = monthPeriod(now)
  const monthly = monthlyFeeAfterDiscount(input.classMonthlyPaise, discountRate(input.discountKind))
  const discountPaise = input.classMonthlyPaise - monthly
  try {
    await createInvoice({
      schoolId: input.schoolId,
      studentId: input.studentId,
      kind: 'admission',
      period,
      dueOn: dueOnForMonth(now),
      items: [
        {
          description: 'One-time admission fee',
          amountPaise: school.admissionFeePaise,
          kind: 'admission',
        },
        {
          description: monthlyFeeDescription(now),
          amountPaise: monthly,
          discountPaise,
          kind: 'monthly',
          period,
        },
      ],
    })
  } catch (error) {
    console.error(error)
  }
}

export async function paidByItem(schoolId: string, itemIds: string[]) {
  const map = new Map<string, number>()
  if (itemIds.length === 0) return map
  const rows = await db()
    .select({
      invoiceItemId: paymentItems.invoiceItemId,
      total: sql<number>`coalesce(sum(${paymentItems.amountPaise}), 0)::int`,
    })
    .from(paymentItems)
    .where(and(eq(paymentItems.schoolId, schoolId), inArray(paymentItems.invoiceItemId, itemIds)))
    .groupBy(paymentItems.invoiceItemId)
  for (const row of rows) {
    map.set(row.invoiceItemId, Number(row.total))
  }
  return map
}

export async function dueByStudent(schoolId: string, studentIds: string[]) {
  const map = new Map<string, number>()
  if (studentIds.length === 0) return map
  const items = await db()
    .select()
    .from(invoiceItems)
    .where(and(eq(invoiceItems.schoolId, schoolId), inArray(invoiceItems.studentId, studentIds)))
  const paid = await paidByItem(
    schoolId,
    items.map((row) => row.id),
  )
  for (const item of items) {
    const left = remainingPaise(item.amountPaise, paid.get(item.id) ?? 0)
    map.set(item.studentId, (map.get(item.studentId) ?? 0) + left)
  }
  return map
}

export async function hasMonthlyInvoice(studentId: string, period: string) {
  const [row] = await db()
    .select({ id: invoiceItems.id })
    .from(invoiceItems)
    .where(and(eq(invoiceItems.studentId, studentId), eq(invoiceItems.kind, 'monthly'), eq(invoiceItems.period, period)))
    .limit(1)
  return Boolean(row)
}

function todayKey(value = new Date()) {
  return value.toISOString().slice(0, 10)
}

async function parentNameFor(schoolId: string, studentId: string) {
  const [link] = await db()
    .select({ name: guardians.fullName })
    .from(studentGuardians)
    .innerJoin(guardians, eq(studentGuardians.guardianId, guardians.id))
    .where(and(eq(studentGuardians.schoolId, schoolId), eq(studentGuardians.studentId, studentId)))
    .limit(1)
  return link?.name ?? '—'
}

export function dueLabel(dueOn: string | null, mandatory: boolean) {
  if (!dueOn) return mandatory ? 'Mandatory' : 'Optional'
  const formatted = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(
    new Date(`${dueOn}T00:00:00`),
  )
  return mandatory ? `Mandatory · ${formatted}` : `Optional · ${formatted}`
}

export async function recordPayment(input: {
  schoolId: string
  studentId: string
  method: string
  reference?: string | null
  itemIds: string[]
  receivedBy: string
}) {
  if (input.itemIds.length === 0) {
    throw new HTTPException(400, { message: 'Tick the fees being paid.' })
  }
  const items = await db()
    .select()
    .from(invoiceItems)
    .where(
      and(
        eq(invoiceItems.schoolId, input.schoolId),
        eq(invoiceItems.studentId, input.studentId),
        inArray(invoiceItems.id, input.itemIds),
      ),
    )
  if (items.length !== input.itemIds.length) {
    throw new HTTPException(400, { message: 'Those fees are not pending for this child.' })
  }
  const paid = await paidByItem(
    input.schoolId,
    items.map((row) => row.id),
  )
  const allocations = items.map((item) => ({
    item,
    amountPaise: remainingPaise(item.amountPaise, paid.get(item.id) ?? 0),
  }))
  const totalPaise = allocations.reduce((sum, row) => sum + row.amountPaise, 0)
  if (totalPaise <= 0) {
    throw new HTTPException(400, { message: 'Those fees are already paid.' })
  }
  const receiptNo = await nextSeq(input.schoolId, 'receipt')
  const [payment] = await db()
    .insert(payments)
    .values({
      schoolId: input.schoolId,
      studentId: input.studentId,
      receiptNo,
      paidOn: todayKey(),
      method: input.method,
      reference: input.reference?.trim() || null,
      totalPaise,
      receivedBy: input.receivedBy,
    })
    .returning()
  if (!payment) throw new HTTPException(500, { message: 'Could not record the payment.' })
  await db().insert(paymentItems).values(
    allocations.map((row) => ({
      schoolId: input.schoolId,
      paymentId: payment.id,
      invoiceItemId: row.item.id,
      amountPaise: row.amountPaise,
    })),
  )
  const invoiceIds = [...new Set(items.map((row) => row.invoiceId))]
  for (const invoiceId of invoiceIds) {
    await refreshInvoiceStatus(invoiceId)
  }
  await notifyReceipt({
    schoolId: input.schoolId,
    studentId: input.studentId,
    receiptNo,
    amountLabel: formatINR(totalPaise),
  })
  return { paymentId: payment.id, receiptNo, totalPaise }
}

export async function loadReceipt(schoolId: string, paymentId: string) {
  const [payment] = await db()
    .select()
    .from(payments)
    .where(and(eq(payments.id, paymentId), eq(payments.schoolId, schoolId)))
    .limit(1)
  if (!payment) return null
  const [student] = await db().select().from(students).where(eq(students.id, payment.studentId)).limit(1)
  const [klass] = student?.classId
    ? await db().select().from(classes).where(eq(classes.id, student.classId)).limit(1)
    : []
  const [school] = await db().select().from(schools).where(eq(schools.id, schoolId)).limit(1)
  const [year] = await db()
    .select()
    .from(academicYears)
    .where(and(eq(academicYears.schoolId, schoolId), eq(academicYears.isCurrent, true)))
    .limit(1)
  const [receiver] = payment.receivedBy
    ? await db().select().from(profiles).where(eq(profiles.id, payment.receivedBy)).limit(1)
    : []
  const lines = await db()
    .select({
      amountPaise: paymentItems.amountPaise,
      description: invoiceItems.description,
    })
    .from(paymentItems)
    .innerJoin(invoiceItems, eq(paymentItems.invoiceItemId, invoiceItems.id))
    .where(eq(paymentItems.paymentId, payment.id))
  return {
    payment: {
      id: payment.id,
      receiptNo: payment.receiptNo,
      paidOn: payment.paidOn,
      method: payment.method,
      reference: payment.reference,
      totalPaise: payment.totalPaise,
      amountInWords: amountInWords(payment.totalPaise),
      receivedBy: receiver?.fullName ?? 'School office',
    },
    school: school
      ? {
          name: school.name,
          address: school.address,
          phone: school.phone,
          email: school.email,
        }
      : null,
    student: {
      id: student?.id ?? payment.studentId,
      firstName: student?.firstName ?? 'Child',
      lastName: student?.lastName ?? null,
      className: klass?.name ?? 'Unassigned',
      rollNo: student?.rollNo ?? null,
      admissionNo: student?.admissionNo ?? '',
      parentName: student ? await parentNameFor(schoolId, student.id) : '—',
      yearLabel: year?.label ?? '',
    },
    items: lines,
  }
}

export async function pendingItems(schoolId: string, studentId: string) {
  const items = await db()
    .select()
    .from(invoiceItems)
    .where(and(eq(invoiceItems.schoolId, schoolId), eq(invoiceItems.studentId, studentId)))
  const paid = await paidByItem(
    schoolId,
    items.map((row) => row.id),
  )
  const types = await db().select().from(feeTypes).where(eq(feeTypes.schoolId, schoolId))
  const invoiceRows = await db()
    .select()
    .from(invoices)
    .where(and(eq(invoices.schoolId, schoolId), eq(invoices.studentId, studentId)))
  return items
    .map((item) => {
      const left = remainingPaise(item.amountPaise, paid.get(item.id) ?? 0)
      const type = types.find((row) => row.id === item.feeTypeId)
      const invoice = invoiceRows.find((row) => row.id === item.invoiceId)
      const mandatory = item.kind !== 'other' || Boolean(type?.isMandatory)
      return {
        id: item.id,
        feeTypeId: item.feeTypeId,
        description: item.description,
        amountPaise: left,
        mandatory,
        dueOn: invoice?.dueOn ?? type?.dueOn ?? null,
        dueLabel: dueLabel(invoice?.dueOn ?? type?.dueOn ?? null, mandatory),
      }
    })
    .filter((item) => item.amountPaise > 0)
}
