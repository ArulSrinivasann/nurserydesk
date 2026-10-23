import { describe, expect, it } from 'vitest'
import {
  attendancePct,
  isLowChild,
  isLowClass,
  lastSchoolDays,
  needsSupport,
  nextAttendance,
  overallLevel,
  periodRange,
} from './attendance.ts'

describe('attendance percentage', () => {
  it('counts present and late over working days', () => {
    expect(attendancePct(19, 20)).toBe(95)
    expect(attendancePct(0, 0)).toBe(0)
  })

  it('flags low child and class rates', () => {
    expect(isLowChild(70)).toBe(true)
    expect(isLowChild(75)).toBe(false)
    expect(isLowClass(87)).toBe(true)
    expect(isLowClass(88)).toBe(false)
  })
})

describe('register helpers', () => {
  it('cycles present, late and absent', () => {
    expect(nextAttendance('present')).toBe('late')
    expect(nextAttendance('late')).toBe('absent')
    expect(nextAttendance('absent')).toBe('present')
  })

  it('uses weekdays for the week and month windows', () => {
    const friday = new Date(2026, 9, 23)
    expect(lastSchoolDays(5, friday)).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
    ])
    expect(periodRange('today', friday).days).toEqual(['2026-10-23'])
  })
})

describe('progress', () => {
  it('averages levels and flags beginning as needing support', () => {
    expect(overallLevel([3, 3, 2, 4, 3])).toBe(3)
    expect(needsSupport([3, 1, 2, 3, 3])).toBe(true)
    expect(needsSupport([2, 2, 3, 3, 4])).toBe(false)
  })
})
