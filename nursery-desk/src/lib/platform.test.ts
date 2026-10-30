import { describe, expect, it } from 'vitest'
import {
  defaultAcademicYear,
  isoDate,
  parseDemoRequest,
  parseIsoDate,
  trialEndDate,
} from './platform.ts'

describe('parseDemoRequest', () => {
  it('keeps a complete request and lowercases the email', () => {
    const parsed = parseDemoRequest({
      school: '  Green Valley  ',
      name: 'Meera',
      phone: '9876543210',
      email: 'Meera@School.Example',
      note: '  40 children  ',
    })
    expect(parsed).toEqual({
      ok: true,
      value: {
        schoolName: 'Green Valley',
        contactName: 'Meera',
        phone: '9876543210',
        email: 'meera@school.example',
        note: '40 children',
      },
    })
  })

  it('asks for the school name when it is missing', () => {
    const parsed = parseDemoRequest({
      school: ' ',
      name: 'Meera',
      phone: '9876543210',
      email: 'meera@school.example',
    })
    expect(parsed).toEqual({ ok: false, error: 'Enter the school name.' })
  })
})

describe('trial and academic year helpers', () => {
  it('sets a 14-day trial end date', () => {
    expect(isoDate(trialEndDate(new Date('2026-10-28T09:00:00')))).toBe('2026-11-11')
  })

  it('uses June as the academic year start', () => {
    expect(defaultAcademicYear(new Date('2026-10-28')).label).toBe('2026–27')
    expect(defaultAcademicYear(new Date('2026-04-02')).label).toBe('2025–26')
  })

  it('parses a calendar date', () => {
    expect(parseIsoDate('2026-11-11')?.getFullYear()).toBe(2026)
    expect(parseIsoDate('11-11-2026')).toBeNull()
  })
})
