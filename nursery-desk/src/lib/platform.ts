import { z } from 'zod'

export const DEMO_TRIAL_DAYS = 14

export const demoRequestSchema = z.object({
  school: z.string().trim().min(1, 'Enter the school name.'),
  name: z.string().trim().min(1, 'Enter your name.'),
  phone: z.string().trim().min(1, 'Enter a phone number.'),
  email: z.string().trim().email('Enter a valid email.'),
  note: z.string().optional(),
})

export type DemoRequestBody = z.infer<typeof demoRequestSchema>

export type ParsedDemoRequest = {
  schoolName: string
  contactName: string
  phone: string
  email: string
  note: string | null
}

export function parseDemoRequest(body: unknown): { ok: true; value: ParsedDemoRequest } | { ok: false; error: string } {
  const result = demoRequestSchema.safeParse(body)
  if (!result.success) {
    return { ok: false, error: result.error.issues[0]?.message ?? 'Enter the school details.' }
  }
  const note = result.data.note?.trim() || null
  return {
    ok: true,
    value: {
      schoolName: result.data.school,
      contactName: result.data.name,
      phone: result.data.phone,
      email: result.data.email.toLowerCase(),
      note,
    },
  }
}

export function addDays(from: Date, days: number) {
  const date = new Date(from)
  date.setDate(date.getDate() + days)
  return date
}

export function addMonths(from: Date, months: number) {
  const date = new Date(from)
  date.setMonth(date.getMonth() + months)
  return date
}

export function trialEndDate(from = new Date(), days = DEMO_TRIAL_DAYS) {
  return addDays(from, days)
}

export function isoDate(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function defaultAcademicYear(from = new Date()) {
  const startYear = from.getMonth() >= 5 ? from.getFullYear() : from.getFullYear() - 1
  return {
    label: `${startYear}–${String(startYear + 1).slice(-2)}`,
    startsOn: new Date(`${startYear}-06-01T00:00:00`),
    endsOn: new Date(`${startYear + 1}-04-30T00:00:00`),
  }
}
