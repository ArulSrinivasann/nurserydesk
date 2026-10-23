import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pill } from '@/components/ui/Pill'
import { useToast } from '@/components/ui/Toast'
import { useTeacherClass } from '@/features/attendance/useTeacherClass'
import { api, ApiError } from '@/lib/api'
import {
  formatWeekdayDate,
  nextAttendance,
  type AttendanceStatus,
} from '@/lib/attendance'
import { cn } from '@/lib/cn'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'

type Payload = {
  date: string
  class: { id: string; name: string }
  saved: boolean
  students: Array<{
    id: string
    firstName: string
    lastName: string | null
    rollNo: number | null
    status: AttendanceStatus
  }>
}

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: 'Present',
  late: 'Late',
  absent: 'Absent',
}

export function AttendancePage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { query: classQuery, classId, className } = useTeacherClass()
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({})
  const register = useQuery({
    queryKey: ['teacher-attendance', classId],
    enabled: Boolean(classId),
    queryFn: () => api<Payload>(`/api/teacher/attendance?classId=${classId}`),
  })

  useEffect(() => {
    if (!register.data) return
    const next: Record<string, AttendanceStatus> = {}
    for (const row of register.data.students) {
      next[row.id] = row.status
    }
    setMarks(next)
  }, [register.data])

  const save = useMutation({
    mutationFn: () =>
      api('/api/teacher/attendance', {
        method: 'PUT',
        body: JSON.stringify({
          classId,
          date: register.data?.date,
          marks: Object.entries(marks).map(([studentId, status]) => ({ studentId, status })),
        }),
      }),
    onSuccess: async () => {
      toast('Attendance saved · absent parents notified')
      await queryClient.invalidateQueries({ queryKey: ['teacher-attendance', classId] })
    },
    onError: (error) => {
      toast(error instanceof ApiError ? error.message : 'Could not save attendance.')
    },
  })

  const counts = useMemo(() => {
    const values = Object.values(marks)
    return {
      present: values.filter((status) => status === 'present').length,
      late: values.filter((status) => status === 'late').length,
      absent: values.filter((status) => status === 'absent').length,
    }
  }, [marks])

  if (classQuery.isLoading || register.isLoading) {
    return <p className="text-muted">Loading the register…</p>
  }
  if (!classId) {
    return (
      <Card>
        <p className="m-0 text-muted">No class is assigned to you yet. Ask the school admin to assign a class.</p>
      </Card>
    )
  }
  if (register.error || !register.data) {
    return (
      <Card>
        <p className="m-0 text-danger">
          {register.error instanceof ApiError ? register.error.message : 'Could not load attendance.'}
        </p>
      </Card>
    )
  }

  const kids = register.data.students

  return (
    <>
      <PageHeader
        title={`Attendance · ${formatWeekdayDate(register.data.date)}`}
        subtitle={`Tap a child to switch between present, late and absent. ${className ?? ''}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Pill tone="success">Present {counts.present}</Pill>
            <Pill tone="warn">Late {counts.late}</Pill>
            <Pill tone="danger">Absent {counts.absent}</Pill>
          </div>
        }
      />
      {kids.length === 0 ? (
        <Card>
          <p className="m-0 text-muted">No children in this class yet. Enrol a child from Admissions.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
          {kids.map((kid, index) => {
            const status = marks[kid.id] ?? 'present'
            return (
              <button
                key={kid.id}
                type="button"
                onClick={() => setMarks((current) => ({ ...current, [kid.id]: nextAttendance(status) }))}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-[20px] border-2 px-2.5 py-4 text-center font-extrabold',
                  status === 'present' && 'border-success bg-success-tint',
                  status === 'late' && 'border-sun bg-warn-tint',
                  status === 'absent' && 'border-danger bg-danger-tint',
                )}
              >
                <Avatar name={kid.firstName} index={index} size="md" />
                {kid.firstName}
                <em className="text-xs font-bold not-italic text-muted">{STATUS_LABEL[status]}</em>
              </button>
            )
          })}
        </div>
      )}
      <div className="mt-[18px] flex flex-wrap gap-2">
        <Button
          variant="alt"
          onClick={() => {
            const next: Record<string, AttendanceStatus> = {}
            for (const kid of kids) next[kid.id] = 'present'
            setMarks(next)
          }}
        >
          Mark all present
        </Button>
        <Button disabled={save.isPending || kids.length === 0} onClick={() => save.mutate()}>
          {save.isPending ? 'Saving…' : 'Save attendance'}
        </Button>
      </div>
    </>
  )
}
