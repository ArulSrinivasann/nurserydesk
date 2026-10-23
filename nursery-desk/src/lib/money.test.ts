import { describe, expect, it } from 'vitest'
import { amountInWords, formatINR, formatINRCompact } from './money.ts'

describe('amount in words', () => {
  it('uses Indian grouping for rupees', () => {
    expect(amountInWords(650000)).toBe('Rupees Six Thousand Five Hundred only')
    expect(amountInWords(10000000)).toBe('Rupees One Lakh only')
    expect(amountInWords(1585000)).toBe('Rupees Fifteen Thousand Eight Hundred Fifty only')
    expect(amountInWords(0)).toBe('Rupees Zero only')
  })
})

describe('format money', () => {
  it('formats paise as rupees and compact lakhs', () => {
    expect(formatINR(650000)).toBe('₹6,500')
    expect(formatINRCompact(42000000)).toBe('₹4.2L')
  })
})
