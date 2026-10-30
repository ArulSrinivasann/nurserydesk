import { z } from 'zod'

export const STAFF_ROLES = ['teacher', 'school_admin'] as const
export type StaffRole = (typeof STAFF_ROLES)[number]

export const SCHOOL_USER_ROLES = ['school_admin', 'teacher', 'parent'] as const
export type SchoolUserRole = (typeof SCHOOL_USER_ROLES)[number]

export type StaffCreateInput = {
  fullName: string
  email: string
  phone: string | null
  role: StaffRole
}

export type UserUpdateInput = {
  fullName: string
  phone: string | null
}

const staffCreateSchema = z.object({
  fullName: z.string().trim().min(1, 'Enter the staff member’s name.'),
  email: z.string().trim().email('Enter a login email.'),
  phone: z.string().optional(),
  role: z.enum(STAFF_ROLES),
})

const userUpdateSchema = z.object({
  fullName: z.string().trim().min(1, 'Enter the person’s name.'),
  phone: z.string().optional(),
})

export function parseStaffCreate(
  body: unknown,
): { ok: true; value: StaffCreateInput } | { ok: false; error: string } {
  const result = staffCreateSchema.safeParse(body)
  if (!result.success) {
    const issue = result.error.issues[0]
    if (issue?.path[0] === 'role') {
      return { ok: false, error: 'Pick teacher or school admin.' }
    }
    return { ok: false, error: issue?.message ?? 'Enter the staff details.' }
  }
  return {
    ok: true,
    value: {
      fullName: result.data.fullName,
      email: result.data.email.toLowerCase(),
      phone: result.data.phone?.trim() || null,
      role: result.data.role,
    },
  }
}

export function parseUserUpdate(
  body: unknown,
): { ok: true; value: UserUpdateInput } | { ok: false; error: string } {
  const result = userUpdateSchema.safeParse(body)
  if (!result.success) {
    return { ok: false, error: result.error.issues[0]?.message ?? 'Enter the person’s details.' }
  }
  return {
    ok: true,
    value: {
      fullName: result.data.fullName,
      phone: result.data.phone?.trim() || null,
    },
  }
}

export function parseTeacherAssignment(
  body: unknown,
): { ok: true; teacherId: string | null } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Pick a teacher.' }
  }
  const teacherId = 'teacherId' in body ? (body as { teacherId?: unknown }).teacherId : undefined
  if (teacherId === null || teacherId === '') {
    return { ok: true, teacherId: null }
  }
  if (typeof teacherId !== 'string') {
    return { ok: false, error: 'Pick a teacher.' }
  }
  return { ok: true, teacherId }
}
