export const ROLES = ['super_admin', 'school_admin', 'teacher', 'parent'] as const

export type Role = (typeof ROLES)[number]

export type SchoolPreview = {
  id: string
  name: string
  academicYearLabel: string
}

export type SessionUser = {
  id: string
  fullName: string
  role: Role
  greeting: string
  subtitle: string
  school: SchoolPreview | null
}

export const ROLE_HOME: Record<Role, string> = {
  super_admin: '/platform/schools',
  school_admin: '/admin/dashboard',
  teacher: '/teacher/attendance',
  parent: '/parent/home',
}

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: 'Platform owner',
  school_admin: 'School admin',
  teacher: 'Teacher',
  parent: 'Parent',
}
