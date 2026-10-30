import { describe, expect, it } from 'vitest'
import {
  applyMergeTags,
  familyLabel,
  firstNameOf,
  messageKind,
  messageKindLabel,
  reminderPreview,
  smsPartCount,
} from './messages.ts'

describe('messageKind', () => {
  it('treats closures as holidays', () => {
    expect(messageKind('School closed 14 Nov', 'Diwali holiday.')).toBe('holiday')
  })

  it('treats fee reminders as alerts', () => {
    expect(messageKind('Fee reminder', 'Please clear pending fees this week.')).toBe('alert')
  })

  it('defaults to announcement', () => {
    expect(messageKind('Diwali show, 6 Nov', 'Costumes: yellow or orange.')).toBe('announcement')
  })

  it('labels kinds for the admin list', () => {
    expect(messageKindLabel('holiday')).toBe('Holiday')
    expect(messageKindLabel('alert')).toBe('Alert')
    expect(messageKindLabel('announcement')).toBe('Announcement')
  })
})

describe('fee reminders', () => {
  it('builds a family label from the child’s surname', () => {
    expect(familyLabel('Menon', 'Rahul')).toBe('Menon family')
    expect(firstNameOf('Rahul Sharma')).toBe('Rahul')
  })

  it('fills merge tags and counts SMS parts', () => {
    expect(
      applyMergeTags('Dear {parent}, please send {child}. Thank you, {school}', {
        parent: 'Rahul',
        child: 'Aarav',
        school: 'Little Sprouts Preschool',
      }),
    ).toBe('Dear Rahul, please send Aarav. Thank you, Little Sprouts Preschool')
    expect(smsPartCount('a'.repeat(160))).toBe(1)
    expect(smsPartCount('a'.repeat(161))).toBe(2)
  })

  it('writes a friendly WhatsApp reminder', () => {
    expect(
      reminderPreview({
        tone: 'friendly',
        parentFirst: 'Rahul',
        childFirst: 'Aarav',
        amountPaise: 650000,
        dueOn: '2026-11-05',
        schoolName: 'Little Sprouts Preschool',
      }),
    ).toBe(
      'Dear Rahul, a gentle reminder that Aarav’s fee of ₹6,500 is due on 5 Nov. Pay in the Nursery Desk app or at the school office. Thank you, Little Sprouts Preschool.',
    )
  })
})
