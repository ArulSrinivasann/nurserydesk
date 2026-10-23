export const PAYMENT_METHODS = ['Cash', 'UPI', 'Card', 'Cheque'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const PARENT_PAYMENT_METHODS = ['UPI', 'Card', 'Net banking'] as const
export type ParentPaymentMethod = (typeof PARENT_PAYMENT_METHODS)[number]

export const INVOICE_STATUSES = ['paid', 'due', 'overdue'] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

export function monthPeriod(value = new Date()) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(value = new Date()) {
  return new Intl.DateTimeFormat('en-IN', { month: 'long' }).format(value)
}

export function monthlyFeeDescription(value = new Date()) {
  return `Monthly fee · ${monthLabel(value)}`
}

export function dueOnForMonth(value = new Date()) {
  const year = value.getFullYear()
  const month = value.getMonth()
  return `${year}-${String(month + 1).padStart(2, '0')}-05`
}

export function seqPeriod(kind: 'invoice' | 'receipt', value = new Date()) {
  const yy = String(value.getFullYear()).slice(-2)
  const mm = String(value.getMonth() + 1).padStart(2, '0')
  return `${kind}-${yy}${mm}`
}

export function formatInvoiceNumber(seq: number, value = new Date()) {
  const yy = String(value.getFullYear()).slice(-2)
  const mm = String(value.getMonth() + 1).padStart(2, '0')
  return `INV-${yy}${mm}-${String(seq).padStart(4, '0')}`
}

export function formatReceiptNumber(seq: number, value = new Date()) {
  const yy = String(value.getFullYear()).slice(-2)
  const mm = String(value.getMonth() + 1).padStart(2, '0')
  return `RC-${yy}${mm}-${String(seq).padStart(4, '0')}`
}

export function invoiceStatus(input: {
  remainingPaise: number
  mandatoryRemainingPaise: number
  dueOn: string
  today?: string
}): InvoiceStatus {
  if (input.remainingPaise <= 0) return 'paid'
  const today = input.today ?? new Date().toISOString().slice(0, 10)
  if (input.mandatoryRemainingPaise > 0 && input.dueOn < today) return 'overdue'
  return 'due'
}

export function remainingPaise(amountPaise: number, paidPaise: number) {
  return Math.max(0, amountPaise - paidPaise)
}

export function isPaymentMethod(value: string): value is PaymentMethod {
  return (PAYMENT_METHODS as readonly string[]).includes(value)
}

export function isParentPaymentMethod(value: string): value is ParentPaymentMethod {
  return (PARENT_PAYMENT_METHODS as readonly string[]).includes(value)
}
