export const ATTENDANCE_STATUSES = ['present', 'late', 'absent'] as const
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

export const LEARNING_AREAS = [
  'Language',
  'Numbers',
  'Motor skills',
  'Social and emotional',
  'Creativity',
] as const
export type LearningArea = (typeof LEARNING_AREAS)[number]

export const PROGRESS_LEVELS = [
  { level: 1, label: 'Beginning' },
  { level: 2, label: 'Developing' },
  { level: 3, label: 'Secure' },
  { level: 4, label: 'Excelling' },
] as const

export function toDateKey(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1)
}

export function isWeekday(value: Date) {
  const day = value.getDay()
  return day !== 0 && day !== 6
}

export function schoolDays(from: Date, to: Date) {
  const days: string[] = []
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate())
  while (cursor <= end) {
    if (isWeekday(cursor)) days.push(toDateKey(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

export function lastSchoolDays(count: number, from = new Date()) {
  const days: string[] = []
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  while (days.length < count) {
    if (isWeekday(cursor)) days.unshift(toDateKey(cursor))
    cursor.setDate(cursor.getDate() - 1)
  }
  return days
}

export function periodRange(period: 'today' | 'week' | 'month', from = new Date()) {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  if (period === 'today') return { from: today, to: today, days: schoolDays(today, today) }
  if (period === 'week') {
    const days = lastSchoolDays(5, today)
    return { from: parseDateKey(days[0] ?? toDateKey(today)), to: today, days }
  }
  const start = new Date(today.getFullYear(), today.getMonth(), 1)
  return { from: start, to: today, days: schoolDays(start, today) }
}

export function attendancePct(presentOrLateCount: number, workingDays: number) {
  if (workingDays <= 0) return 0
  return Math.round((presentOrLateCount / workingDays) * 100)
}

export function presentOrLate(status: string) {
  return status === 'present' || status === 'late'
}

export function isLowChild(pct: number) {
  return pct < 75
}

export function isLowClass(pct: number) {
  return pct < 88
}

export function nextAttendance(status: AttendanceStatus): AttendanceStatus {
  const index = ATTENDANCE_STATUSES.indexOf(status)
  return ATTENDANCE_STATUSES[(index + 1) % ATTENDANCE_STATUSES.length] ?? 'present'
}

export function overallLevel(levels: number[]) {
  if (levels.length === 0) return 0
  return Math.round(levels.reduce((sum, level) => sum + level, 0) / levels.length)
}

export function needsSupport(levels: number[]) {
  return levels.some((level) => level === 1)
}

export function levelTrend(current: number, previous: number) {
  if (current > previous) return 'improved' as const
  if (current < previous) return 'dropped' as const
  return 'no_change' as const
}

export function weekdayLabel(value: Date | string) {
  const date = typeof value === 'string' ? parseDateKey(value) : value
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short' }).format(date)
}

export function formatWeekdayDate(value: Date | string) {
  const date = typeof value === 'string' ? parseDateKey(value) : value
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date)
}

export function periodLabel(period: 'today' | 'week' | 'month', from = new Date()) {
  const range = periodRange(period, from)
  if (period === 'today') return formatWeekdayDate(from)
  if (period === 'week') {
    const start = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(range.from)
    const end = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(range.to)
    return `${start}–${end}`
  }
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(from)
}

export function levelLabel(level: number) {
  return PROGRESS_LEVELS.find((item) => item.level === level)?.label ?? 'Not assessed'
}

export const LEVEL_TONES = ['danger', 'warn', 'info', 'success'] as const
export const LEVEL_COLOURS = ['#E8456E', '#E0A200', '#3B5BDB', '#2FA56E'] as const
