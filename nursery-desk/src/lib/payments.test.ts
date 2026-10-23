import { describe, expect, it } from 'vitest'
import { MockPaymentProvider, RazorpayPaymentProvider } from '../../server/payments.ts'

describe('payment providers', () => {
  it('mocks a successful parent charge', async () => {
    const result = await new MockPaymentProvider().charge({
      amountPaise: 80000,
      method: 'UPI',
      studentId: 'student',
      schoolId: 'school',
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.providerRef.startsWith('mock_upi_')).toBe(true)
  })

  it('refuses live Razorpay charges until checkout is wired', async () => {
    const result = await new RazorpayPaymentProvider('rzp_test', 'secret').charge({
      amountPaise: 80000,
      method: 'Card',
      studentId: 'student',
      schoolId: 'school',
    })
    expect(result.ok).toBe(false)
  })
})
