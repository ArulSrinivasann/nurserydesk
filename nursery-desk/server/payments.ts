import type { ParentPaymentMethod } from '../src/lib/fees.ts'

export type ChargeInput = {
  amountPaise: number
  method: ParentPaymentMethod
  studentId: string
  schoolId: string
}

export type ChargeResult = { ok: true; providerRef: string } | { ok: false; message: string }

export interface PaymentProvider {
  charge(input: ChargeInput): Promise<ChargeResult>
}

export class MockPaymentProvider implements PaymentProvider {
  async charge(input: ChargeInput): Promise<ChargeResult> {
    if (input.amountPaise <= 0) {
      return { ok: false, message: 'Nothing to pay.' }
    }
    return { ok: true, providerRef: `mock_${input.method.replace(/\s+/g, '').toLowerCase()}_${Date.now()}` }
  }
}

/** Live Razorpay checkout is not wired; this class is the swap-in point. */
export class RazorpayPaymentProvider implements PaymentProvider {
  keyId: string
  keySecret: string

  constructor(keyId: string, keySecret: string) {
    this.keyId = keyId
    this.keySecret = keySecret
  }

  async charge(): Promise<ChargeResult> {
    if (!this.keyId || !this.keySecret) {
      return { ok: false, message: 'Razorpay is not configured.' }
    }
    return { ok: false, message: 'Razorpay checkout is not connected in this environment.' }
  }
}

export function createPaymentProvider(): PaymentProvider {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (process.env.PAYMENT_PROVIDER === 'razorpay' && keyId && keySecret) {
    return new RazorpayPaymentProvider(keyId, keySecret)
  }
  return new MockPaymentProvider()
}

export const paymentProvider = createPaymentProvider()
