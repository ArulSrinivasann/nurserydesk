import { describe, expect, it } from 'vitest'
import {
  discountRate,
  enrolmentStatus,
  firstInvoicePaise,
  formatAdmissionNo,
  monthlyFeeAfterDiscount,
  nextAdmissionSeq,
  prefillFromEnquiry,
} from './admissions.ts'

describe('admission numbers', () => {
  it('formats PREFIX-YY-NNNN', () => {
    expect(formatAdmissionNo('LS', 2026, 41)).toBe('LS-26-0041')
  })

  it('increments the sequence for the same year', () => {
    expect(nextAdmissionSeq(['LS-26-0041', 'LS-26-0049', 'RK-26-0001'], 'LS', 2026)).toBe(50)
  })
})

describe('fees', () => {
  it('applies sibling and staff discounts to the monthly fee only', () => {
    expect(monthlyFeeAfterDiscount(650000, discountRate('sibling'))).toBe(585000)
    expect(monthlyFeeAfterDiscount(650000, discountRate('staff'))).toBe(487500)
    expect(firstInvoicePaise(1000000, 650000, discountRate('sibling'))).toBe(1585000)
  })
})

describe('enquiry prefill', () => {
  it('splits the child name and carries parent, phone and class', () => {
    expect(
      prefillFromEnquiry({
        childName: 'Arjun Nair',
        parentName: 'Suresh Nair',
        phone: '+91 98840 55671',
        classInterest: 'LKG',
      }),
    ).toEqual({
      firstName: 'Arjun',
      lastName: 'Nair',
      parentName: 'Suresh Nair',
      phone: '+91 98840 55671',
      classInterest: 'LKG',
      gender: 'Girl',
      discount: 'none',
    })
  })
})

describe('enrolment status', () => {
  it('allows enrolment with missing documents', () => {
    expect(enrolmentStatus(['birth_certificate'])).toBe('documents_pending')
    expect(
      enrolmentStatus(['birth_certificate', 'photo', 'immunisation', 'parent_id', 'address_proof']),
    ).toBe('enrolled')
  })
})
