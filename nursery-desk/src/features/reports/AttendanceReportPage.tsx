import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pill } from '@/components/ui/Pill'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { StatCard } from '@/components/ui/StatCard'
import { Table } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { api, ApiError } from '@/lib/api'
import { isLowChild, isLowClass, type AttendanceStatus } from '@/lib/attendance'
import { downloadCsv } from '@/lib/csv'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

type Period = 'today' | 'week' | 'month'

type Payload = {
  period: Period
  periodLabel: string
  classId: string
  classes: Array<{ id: string; name: string }>
  stats: {
    pct: number
    present: number
    late: number
    absent: number
    enrolled: number
    below75: number
  }
  byClass: Array<{
    id: string
    name: string
    teacherName: string
    children: number
    present: number
    late: number
    absent: number
    pct: number
  }>
  week: Array<{ label: string; pct: number }>
  students: Array<{
    id: string
    firstName: string
    lastName: string | null
    rollNo: number | null
    status: AttendanceStatus | null
    presentDays: number
    absentDays: number
    workingDays: number
    pct: number
  }> | null
}

const STATUS_PILL: Record<AttendanceStatus, { label: string; tone: 'success' | 'warn' | 'danger' }> = {
  present: { label: 'Present', tone: 'success' },
  late: { label: 'Late', tone: 'warn' },
  absent: { label: 'Absent', tone: 'danger' },
}

export function AttendanceReportPage() {
  const { toast } = useToast()
  const [classId, setClassId] = useState<'all' | string>('all')
  const [period, setPeriod] = useState<Period>('week')
  const query = useQuery({
    queryKey: ['attendance-report', classId, period],
    queryFn: () =>
      api<Payload>(`/api/reports/attendance?classId=${classId}&period=${period}`),
  })

  if (query.isLoading) {
    return <p className="text-muted">Loading the attendance report…</p>
  }
  if (query.error || !query.data) {
    return (
      <Card>
        <p className="m-0 text-danger">
          {query.error instanceof ApiError ? query.error.message : 'Could not load the attendance report.'}
        </p>
      </Card>
    )
  }

  const data = query.data
  const classLabel = classId === 'all' ? 'All classes' : (data.classes.find((row) => row.id === classId)?.name ?? 'Class')

  function exportExcel() {
    if (data.students) {
      downloadCsv(
        `attendance-${classLabel}-${period}.csv`,
        period === 'today'
          ? ['Roll', 'Child', 'Status']
          : ['Roll', 'Child', 'Present days', 'Absent days', 'Attendance'],
        data.students.map((row) =>
          period === 'today'
            ? [
                String(row.rollNo ?? 0).padStart(2, '0'),
                `${row.firstName}${row.lastName ? ` ${row.lastName}` : ''}`,
                row.status ?? '—',
              ]
            : [
                String(row.rollNo ?? 0).padStart(2, '0'),
                `${row.firstName}${row.lastName ? ` ${row.lastName}` : ''}`,
                `${row.presentDays} of ${row.workingDays}`,
                row.absentDays,
                `${row.pct}%`,
              ],
        ),
      )
    } else {
      downloadCsv(
        `attendance-${classLabel}-${period}.csv`,
        ['Class', 'Teacher', 'Children', 'Present', 'Late', 'Absent', 'Attendance'],
        data.byClass.map((row) => [
          row.name,
          row.teacherName,
          row.children,
          row.present,
          row.late,
          row.absent,
          `${row.pct}%`,
        ]),
      )
    }
    toast('Excel file downloaded')
  }

  return (
    <>
      <div data-print-hide>
        <PageHeader
          title="Attendance report"
          subtitle={`${classLabel} · ${data.periodLabel}`}
          action={
            <div className="flex flex-wrap gap-2">
              <Button
                variant="alt"
                onClick={() => {
                  window.print()
                  toast('PDF report downloaded')
                }}
              >
                Download PDF
              </Button>
              <Button variant="alt" onClick={exportExcel}>
                Export to Excel
              </Button>
            </div>
          }
        />
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Class">
            <Chip active={classId === 'all'} onClick={() => setClassId('all')}>
              All
            </Chip>
            {data.classes.map((row) => (
              <Chip key={row.id} active={classId === row.id} onClick={() => setClassId(row.id)}>
                {row.name}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Period">
            {(['today', 'week', 'month'] as const).map((item) => (
              <Chip key={item} active={period === item} onClick={() => setPeriod(item)}>
                {item === 'today' ? 'Today' : item === 'week' ? 'Week' : 'Month'}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
        <StatCard
          label="Attendance"
          value={`${data.stats.pct}%`}
          hint={period === 'today' ? 'Present or late' : 'Average per day'}
          trend={data.stats.pct >= 90 ? 'up' : 'down'}
        />
        <StatCard
          label="Present"
          value={String(data.stats.present)}
          hint={`of ${data.stats.enrolled} children`}
          trend="up"
        />
        <StatCard
          label="Absent"
          value={String(data.stats.absent)}
          hint={period === 'today' ? 'Parents notified' : 'Average per day'}
          trend="down"
        />
        <StatCard
          label="Below 75%"
          value={String(data.stats.below75)}
          hint="children to follow up"
          trend={data.stats.below75 ? 'down' : 'up'}
        />
      </div>

      <div className="mt-[26px] grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-2">By class</h3>
          <Table
            columns={[
              { header: 'Class', cell: (row) => <b>{row.name}</b> },
              { header: 'Teacher', cell: (row) => row.teacherName },
              { header: 'Children', cell: (row) => row.children },
              { header: 'Present', cell: (row) => row.present },
              { header: 'Late', cell: (row) => row.late },
              { header: 'Absent', cell: (row) => row.absent },
              {
                header: 'Attendance',
                cell: (row) => (
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <b>{row.pct}%</b>
                      {isLowClass(row.pct) ? <Pill tone="danger">Low</Pill> : null}
                    </div>
                    <ProgressBar
                      value={row.pct}
                      tone={isLowClass(row.pct) ? 'danger' : 'success'}
                      label={`${row.name} attendance`}
                    />
                  </div>
                ),
              },
            ]}
            rows={data.byClass}
            rowKey={(row) => row.id}
          />
        </Card>
        <Card>
          <h3 className="mb-3">Last 5 school days</h3>
          <div className="flex h-[150px] items-end gap-3">
            {data.week.map((day) => (
              <div
                key={day.label}
                className="flex h-full flex-1 flex-col items-center justify-end gap-1.5 text-xs font-bold text-muted"
              >
                {day.pct}%
                <span
                  className="w-full rounded-[10px_10px_4px_4px] bg-primary/30"
                  style={{ height: `${Math.max(8, (day.pct - 60) * 2.2)}%` }}
                />
                {day.label}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <h2 className="mt-[26px] mb-3.5 text-[22px]">{classId === 'all' ? 'Students' : `${classLabel} students`}</h2>
      {classId === 'all' ? (
        <Card>
          <p className="m-0 text-muted">Pick a class above to see attendance for each child, ordered by roll number.</p>
        </Card>
      ) : (
        <Card>
          <Table
            columns={
              period === 'today'
                ? [
                    { header: 'Roll', cell: (row) => String(row.rollNo ?? 0).padStart(2, '0') },
                    {
                      header: 'Child',
                      cell: (row) => (
                        <div className="flex items-center gap-2.5 font-bold">
                          <Avatar
                            name={row.firstName}
                            index={data.students?.findIndex((item) => item.id === row.id) ?? 0}
                          />
                          {row.firstName} {row.lastName}
                        </div>
                      ),
                    },
                    {
                      header: 'Status',
                      cell: (row) =>
                        row.status ? (
                          <Pill tone={STATUS_PILL[row.status].tone}>{STATUS_PILL[row.status].label}</Pill>
                        ) : (
                          '—'
                        ),
                    },
                  ]
                : [
                    { header: 'Roll', cell: (row) => String(row.rollNo ?? 0).padStart(2, '0') },
                    {
                      header: 'Child',
                      cell: (row) => (
                        <div className="flex items-center gap-2.5 font-bold">
                          <Avatar
                            name={row.firstName}
                            index={data.students?.findIndex((item) => item.id === row.id) ?? 0}
                          />
                          {row.firstName} {row.lastName}
                        </div>
                      ),
                    },
                    {
                      header: 'Present days',
                      cell: (row) => `${row.presentDays} of ${row.workingDays}`,
                    },
                    { header: 'Absent days', cell: (row) => row.absentDays },
                    {
                      header: 'Attendance',
                      cell: (row) => (
                        <>
                          {row.pct}%{' '}
                          {isLowChild(row.pct) ? <Pill tone="danger">Below 75%</Pill> : null}
                        </>
                      ),
                    },
                  ]
            }
            rows={data.students ?? []}
            rowKey={(row) => row.id}
          />
        </Card>
      )}
    </>
  )
}
