export const GENDERS = ['Girl', 'Boy', 'Other'] as const
export type Gender = (typeof GENDERS)[number]

export const DISCOUNTS = [
  { id: 'none', label: 'None', rate: 0 },
  { id: 'sibling', label: 'Sibling (10%)', rate: 0.1 },
  { id: 'staff', label: 'Staff child (25%)', rate: 0.25 },
] as const
export type DiscountKind = (typeof DISCOUNTS)[number]['id']

export const DOC_KINDS = [
  { id: 'birth_certificate', label: 'Birth certificate' },
  { id: 'photo', label: 'Child photo' },
  { id: 'immunisation', label: 'Immunisation record' },
  { id: 'parent_id', label: 'Parent ID proof' },
  { id: 'address_proof', label: 'Address proof' },
] as const
export type DocKind = (typeof DOC_KINDS)[number]['id']

export const ENQUIRY_STATUSES = ['New', 'Follow-up', 'Visit booked', 'Converted', 'Lost'] as const
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number]

export const ENQUIRY_SOURCES = ['Walk-in', 'Phone', 'Website', 'Instagram', 'Referral'] as const
export type EnquirySource = (typeof ENQUIRY_SOURCES)[number]

export const STUDENT_STATUSES = ['applied', 'documents_pending', 'enrolled', 'ready', 'withdrawn'] as const
export type StudentStatus = (typeof STUDENT_STATUSES)[number]

export function deriveAdmissionPrefix(schoolName: string) {
  const words = schoolName
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
  if (words.length >= 2) {
    return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase()
  }
  return schoolName.trim().slice(0, 2).toUpperCase() || 'ND'
}

export function yearSuffix(year: number) {
  return String(year).slice(-2).padStart(2, '0')
}

export function formatAdmissionNo(prefix: string, year: number, seq: number) {
  return `${prefix.toUpperCase()}-${yearSuffix(year)}-${String(seq).padStart(4, '0')}`
}

export function nextAdmissionSeq(existing: string[], prefix: string, year: number) {
  const re = new RegExp(`^${prefix}-(\\d{2})-(\\d+)$`, 'i')
  const suffix = yearSuffix(year)
  let max = 0
  for (const value of existing) {
    const match = value.match(re)
    if (match && match[1] === suffix) {
      max = Math.max(max, Number(match[2]))
    }
  }
  return max + 1
}

export function monthlyFeeAfterDiscount(monthlyPaise: number, rate: number) {
  return Math.round(monthlyPaise * (1 - rate))
}

export function firstInvoicePaise(admissionFeePaise: number, monthlyPaise: number, rate: number) {
  return admissionFeePaise + monthlyFeeAfterDiscount(monthlyPaise, rate)
}

export function discountRate(kind: DiscountKind) {
  return DISCOUNTS.find((item) => item.id === kind)?.rate ?? 0
}

export function prefillFromEnquiry(enquiry: {
  childName: string
  parentName: string
  phone: string
  classInterest: string | null
}) {
  const parts = enquiry.childName.trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] ?? '',
    lastName: parts.slice(1).join(' '),
    parentName: enquiry.parentName,
    phone: enquiry.phone,
    classInterest: enquiry.classInterest ?? '',
    gender: 'Girl' as Gender,
    discount: 'none' as DiscountKind,
  }
}

export function enrolmentStatus(uploadedKinds: readonly string[]): StudentStatus {
  const missing = DOC_KINDS.some((doc) => !uploadedKinds.includes(doc.id))
  return missing ? 'documents_pending' : 'enrolled'
}

export function whatsappHref(phone: string) {
  const digits = phone.replace(/\D/g, '')
  return `https://wa.me/${digits}`
}
