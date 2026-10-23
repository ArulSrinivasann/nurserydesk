/** Format integer paise as Indian rupees. */
export function formatINR(amountPaise: number): string {
  const rupees = amountPaise / 100
  const fractionDigits = Number.isInteger(rupees) ? 0 : 2
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(rupees)
}

export function formatINRCompact(amountPaise: number): string {
  const rupees = Math.abs(amountPaise) / 100
  if (rupees >= 100000) {
    const lakhs = rupees / 100000
    const text = lakhs >= 10 ? lakhs.toFixed(0) : lakhs.toFixed(1).replace(/\.0$/, '')
    return `₹${text}L`
  }
  return formatINR(amountPaise)
}

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
] as const

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'] as const

function twoDigit(value: number) {
  if (value < 20) return ONES[value] ?? ''
  const tens = TENS[Math.floor(value / 10)] ?? ''
  const ones = ONES[value % 10] ?? ''
  return ones ? `${tens} ${ones}` : tens
}

function threeDigit(value: number) {
  const hundred = Math.floor(value / 100)
  const rest = value % 100
  const parts: string[] = []
  if (hundred > 0) parts.push(`${ONES[hundred]} Hundred`)
  if (rest > 0) parts.push(twoDigit(rest))
  return parts.join(' ')
}

export function inIndianWords(rupees: number) {
  if (rupees === 0) return 'Zero'
  const crore = Math.floor(rupees / 10000000)
  const lakh = Math.floor((rupees % 10000000) / 100000)
  const thousand = Math.floor((rupees % 100000) / 1000)
  const rest = rupees % 1000
  const parts: string[] = []
  if (crore > 0) parts.push(`${twoDigit(crore)} Crore`)
  if (lakh > 0) parts.push(`${twoDigit(lakh)} Lakh`)
  if (thousand > 0) parts.push(`${twoDigit(thousand)} Thousand`)
  if (rest > 0) parts.push(threeDigit(rest))
  return parts.join(' ')
}

export function amountInWords(amountPaise: number) {
  const rupees = Math.floor(Math.abs(Math.round(amountPaise)) / 100)
  return `Rupees ${inIndianWords(rupees)} only`
}
