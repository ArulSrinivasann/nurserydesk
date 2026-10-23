import { describe, expect, it } from 'vitest'
import {
  formatInvoiceNumber,
  formatReceiptNumber,
  invoiceStatus,
  isParentPaymentMethod,
  monthlyFeeDescription,
  remainingPaise,
} from './fees.ts'

describe('invoice numbering', () => {
  it('builds sequential invoice and receipt numbers', () => {
    const october = new Date(2026, 9, 23)
    expect(formatInvoiceNumber(1, october)).toBe('INV-2610-0001')
    expect(formatReceiptNumber(21, october)).toBe('RC-2610-0021')
    expect(monthlyFeeDescription(october)).toBe('Monthly fee · October')
  })
})

describe('invoice status', () => {
  it('is paid when nothing remains, overdue only for mandatory arrears', () => {
    expect(
      invoiceStatus({ remainingPaise: 0, mandatoryRemainingPaise: 0, dueOn: '2026-10-05', today: '2026-10-23' }),
    ).toBe('paid')
    expect(
      invoiceStatus({ remainingPaise: 80000, mandatoryRemainingPaise: 0, dueOn: '2026-10-05', today: '2026-10-23' }),
    ).toBe('due')
    expect(
      invoiceStatus({ remainingPaise: 650000, mandatoryRemainingPaise: 650000, dueOn: '2026-10-05', today: '2026-10-23' }),
    ).toBe('overdue')
    expect(
      invoiceStatus({ remainingPaise: 650000, mandatoryRemainingPaise: 650000, dueOn: '2026-11-05', today: '2026-10-23' }),
    ).toBe('due')
  })

  it('never lets paid go below zero remaining', () => {
    expect(remainingPaise(650000, 700000)).toBe(0)
  })
})

describe('parent payment methods', () => {
  it('allows UPI, Card and Net banking, not cash', () => {
    expect(isParentPaymentMethod('UPI')).toBe(true)
    expect(isParentPaymentMethod('Net banking')).toBe(true)
    expect(isParentPaymentMethod('Cash')).toBe(false)
  })
})
