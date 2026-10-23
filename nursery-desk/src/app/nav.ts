import type { Role } from '@/types/roles'

export type NavItem = {
  to: string
  label: string
  icon: string
}

export const ROLE_NAV: Record<Role, NavItem[]> = {
  school_admin: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: '🏠' },
    { to: '/admin/school', label: 'School', icon: '🏫' },
    { to: '/admin/classes', label: 'Classes', icon: '📚' },
    { to: '/admin/students', label: 'Students', icon: '🧒' },
    { to: '/admin/admissions', label: 'Admissions', icon: '📋' },
    { to: '/admin/fees', label: 'Fees', icon: '💳' },
    { to: '/admin/fees/other', label: 'Other fees', icon: '🏅' },
    { to: '/admin/fees/collect', label: 'Collect payment', icon: '🧾' },
    { to: '/admin/reports/attendance', label: 'Attendance report', icon: '📊' },
    { to: '/admin/enquiries', label: 'Enquiries', icon: '📞' },
  ],
  teacher: [
    { to: '/teacher/attendance', label: 'Attendance', icon: '✅' },
    { to: '/teacher/updates', label: 'Daily updates', icon: '📝' },
    { to: '/teacher/progress', label: 'Student progress', icon: '🌟' },
    { to: '/teacher/reports', label: 'Progress report', icon: '📄' },
  ],
  parent: [
    { to: '/parent/home', label: 'My child', icon: '🌱' },
    { to: '/parent/fees', label: 'Fees', icon: '💳' },
  ],
  super_admin: [
    { to: '/platform/schools', label: 'Schools', icon: '🏫' },
    { to: '/platform/plans', label: 'Plans', icon: '🏷️' },
  ],
}
