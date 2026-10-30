import { afterEach, describe, expect, it } from 'vitest'
import { app } from '../../server/app.ts'
import { parseStaffCreate, parseTeacherAssignment, parseUserUpdate } from './staff.ts'

describe('parseStaffCreate', () => {
  it('keeps a teacher and lowercases the email', () => {
    expect(
      parseStaffCreate({
        fullName: '  Ms. Devi  ',
        email: 'Devi@LittleSprouts.Example',
        phone: ' 98410 20001 ',
        role: 'teacher',
      }),
    ).toEqual({
      ok: true,
      value: {
        fullName: 'Ms. Devi',
        email: 'devi@littlesprouts.example',
        phone: '98410 20001',
        role: 'teacher',
      },
    })
  })

  it('asks for a name when it is missing', () => {
    expect(
      parseStaffCreate({
        fullName: ' ',
        email: 'devi@school.example',
        role: 'teacher',
      }),
    ).toEqual({ ok: false, error: 'Enter the staff member’s name.' })
  })

  it('rejects parent as a staff role', () => {
    expect(
      parseStaffCreate({
        fullName: 'Rahul',
        email: 'rahul@school.example',
        role: 'parent',
      }),
    ).toEqual({ ok: false, error: 'Pick teacher or school admin.' })
  })
})

describe('parseUserUpdate', () => {
  it('clears a blank phone', () => {
    expect(parseUserUpdate({ fullName: 'Priya', phone: '  ' })).toEqual({
      ok: true,
      value: { fullName: 'Priya', phone: null },
    })
  })
})

describe('parseTeacherAssignment', () => {
  it('allows clearing the class teacher', () => {
    expect(parseTeacherAssignment({ teacherId: null })).toEqual({ ok: true, teacherId: null })
    expect(parseTeacherAssignment({ teacherId: '' })).toEqual({ ok: true, teacherId: null })
  })

  it('keeps a teacher id', () => {
    expect(parseTeacherAssignment({ teacherId: 'teacher-1' })).toEqual({
      ok: true,
      teacherId: 'teacher-1',
    })
  })
})

describe('POST /api/staff', () => {
  const originalSecret = process.env.SESSION_SECRET

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = originalSecret
  })

  it('asks school admins to sign in before creating staff', async () => {
    process.env.SESSION_SECRET = 'test-secret'
    const response = await app.request('/api/staff', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Ms. Devi',
        email: 'devi@school.example',
        role: 'teacher',
      }),
    })
    expect(response.status).toBe(401)
    const body = (await response.json()) as { error: string }
    expect(body.error).toBe('Please sign in.')
  })
})
