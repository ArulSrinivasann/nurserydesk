import type { LearningArea } from '@/lib/attendance'

export type ProgressArea = {
  area: LearningArea
  level: number
  previousLevel: number
  trend: 'improved' | 'dropped' | 'no_change'
}

export type ProgressStudent = {
  id: string
  firstName: string
  lastName: string | null
  rollNo: number | null
  admissionNo: string
  assessed: boolean
  overall: number
  needsSupport: boolean
  improved: boolean
  attendancePct: number
  remark: string
  areas: ProgressArea[]
}

export type ProgressPayload = {
  school: {
    name: string
    address: string | null
    phone: string | null
    email: string | null
    yearLabel: string
  }
  class: { id: string; name: string; teacherName: string }
  term: { id: string; label: string }
  previousTerm: { id: string; label: string } | null
  assessed: number
  total: number
  improved: number
  needSupport: number
  areaAverages: Array<{ area: LearningArea; average: number }>
  students: ProgressStudent[]
}
