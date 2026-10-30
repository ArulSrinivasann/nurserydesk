import type { NavIconName } from '@/components/ui/NavIcon'
import type { Role } from '@/types/roles'

export type NavLeaf = {
  to: string
  label: string
  icon: NavIconName
}

export type NavGroup = {
  label: string
  icon: NavIconName
  children: NavLeaf[]
}

export type NavItem = NavLeaf | NavGroup

export function isNavGroup(item: NavItem): item is NavGroup {
  return 'children' in item
}

export const ROLE_NAV: Record<Role, NavItem[]> = {
  school_admin: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { to: '/admin/enquiries', label: 'Enquiries', icon: 'enquiries' },
    { to: '/admin/admissions', label: 'Admissions', icon: 'admissions' },
    { to: '/admin/students', label: 'Students', icon: 'students' },
    { to: '/admin/fees', label: 'Fees', icon: 'fees' },
    { to: '/admin/fees/collect', label: 'Collect payment', icon: 'collect' },
    { to: '/admin/fees/other', label: 'Other fees', icon: 'otherFees' },
    { to: '/admin/reports/attendance', label: 'Attendance report', icon: 'report' },
    { to: '/admin/messages', label: 'Alerts', icon: 'messages' },
    { to: '/admin/classes', label: 'Classes', icon: 'classes' },
    { to: '/admin/school', label: 'School', icon: 'school' },
    {
      label: 'User',
      icon: 'students',
      children: [
        { to: '/admin/users/staff', label: 'Staff creation', icon: 'child' },
        { to: '/admin/users/assign', label: 'Assign to class', icon: 'classes' },
        { to: '/admin/users', label: 'User management', icon: 'document' },
      ],
    },
  ],
  teacher: [
    { to: '/teacher/attendance', label: 'Attendance', icon: 'attendance' },
    { to: '/teacher/updates', label: 'Daily updates', icon: 'updates' },
    { to: '/teacher/progress', label: 'Student progress', icon: 'progress' },
    { to: '/teacher/reports', label: 'Progress report', icon: 'document' },
  ],
  parent: [
    { to: '/parent/home', label: 'My child', icon: 'child' },
    { to: '/parent/fees', label: 'Fees', icon: 'fees' },
  ],
  super_admin: [
    { to: '/platform/demos', label: 'Demo requests', icon: 'messages' },
    { to: '/platform/schools', label: 'Schools', icon: 'school' },
    { to: '/platform/plans', label: 'Plans', icon: 'plans' },
  ],
}
