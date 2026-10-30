import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pill } from '@/components/ui/Pill'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { StatCard } from '@/components/ui/StatCard'
import { Table } from '@/components/ui/Table'
import { api, ApiError } from '@/lib/api'
import { formatINR, formatINRCompact } from '@/lib/money'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

type Payload = {
  yearLabel: string
  monthLabel: string
  enrolled: number
  enrolledThisMonth: number
  presentTodayPct: number | null
  presentTodayHint: string
  presentTodayTrend: 'up' | 'down' | 'neutral'
  feesCollectedPaise: number
  feesCollectedPct: number
  overdueCount: number
  overduePaise: number
  classes: Array<{ id: string; name: string; childCount: number; capacity: number }>
  week: Array<{ label: string; pct: number | null }>
  recentAdmissions: Array<{
    id: string
    firstName: string
    lastName: string | null
    admissionNo: string
    className: string
    rollNo: number | null
    parentName: string
    status: string
  }>
}

function statusPill(status: string) {
  if (status === 'enrolled') return <Pill tone="success">Enrolled</Pill>
  if (status === 'documents_pending') return <Pill tone="warn">Documents pending</Pill>
  if (status === 'applied') return <Pill tone="info">Applied</Pill>
  return <Pill>{status}</Pill>
}

export function DashboardPage() {
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<Payload>('/api/dashboard'),
  })

  if (query.isLoading) {
    return <p className="text-muted">Loading dashboard…</p>
  }
  if (query.error || !query.data) {
    return (
      <Card>
        <p className="m-0 text-danger">
          {query.error instanceof ApiError ? query.error.message : 'Could not load the dashboard.'}
        </p>
      </Card>
    )
  }

  const data = query.data
  const enrolledHint =
    data.enrolledThisMonth > 0 ? `+${data.enrolledThisMonth} this month` : 'No new enrolments this month'

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
        <StatCard
          label="Children enrolled"
          value={String(data.enrolled)}
          hint={enrolledHint}
          trend={data.enrolledThisMonth > 0 ? 'up' : 'neutral'}
        />
        <StatCard
          label="Present today"
          value={data.presentTodayPct == null ? '—' : `${data.presentTodayPct}%`}
          hint={data.presentTodayHint}
          trend={data.presentTodayTrend}
        />
        <StatCard
          label={`Fees collected (${data.monthLabel})`}
          value={formatINRCompact(data.feesCollectedPaise)}
          hint={
            data.feesCollectedPct === 0 && data.feesCollectedPaise === 0
              ? 'No payments recorded this month'
              : `${data.feesCollectedPct}% of billed`
          }
          trend={data.feesCollectedPaise > 0 ? 'up' : 'neutral'}
        />
        <StatCard
          label="Overdue invoices"
          value={String(data.overdueCount)}
          hint={data.overdueCount === 0 ? 'All invoices are current' : `${formatINR(data.overduePaise)} pending`}
          trend={data.overdueCount > 0 ? 'down' : 'up'}
        />
      </div>

      <div className="mt-[26px] grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3.5 flex items-center justify-between gap-2">
            <h3>Attendance this week</h3>
            <Pill tone="info" className="bg-nav-active-bg text-nav-active">
              All classes
            </Pill>
          </div>
          <div className="flex h-[150px] items-end gap-3">
            {data.week.map((day) => (
              <div
                key={day.label}
                className="flex h-full flex-1 flex-col items-center justify-end gap-1.5 text-xs font-bold text-muted"
              >
                {day.pct == null ? '—' : `${day.pct}%`}
                <span
                  className="w-full rounded-[10px_10px_4px_4px] bg-primary/30"
                  style={{ height: day.pct == null ? '12%' : `${Math.max(8, day.pct - 40)}%` }}
                />
                {day.label}
              </div>
            ))}
          </div>
          <p className="mb-0 mt-3 text-[13px] text-muted">Present or late across all classes.</p>
        </Card>
        <Card>
          <div className="flex items-center justify-between gap-2">
            <h3>Class strength</h3>
            <Button
              variant="alt"
              className="bg-nav-active-bg font-semibold text-nav-active"
              onClick={() => void navigate('/admin/classes')}
            >
              Manage classes
            </Button>
          </div>
          {data.classes.length === 0 ? (
            <p className="mb-0 mt-3.5 text-muted">Add classes so strength can show here.</p>
          ) : (
            <div className="mt-3.5 grid gap-3">
              {data.classes.map((row) => {
                const full = row.capacity > 0 && row.childCount / row.capacity > 0.95
                return (
                  <div key={row.id}>
                    <div className="mb-1 flex justify-between gap-2">
                      <b>{row.name}</b>
                      <span className="text-muted">
                        {row.childCount}/{row.capacity}
                      </span>
                    </div>
                    <ProgressBar
                      value={row.childCount}
                      max={row.capacity}
                      tone={full ? 'danger' : 'success'}
                      label={row.name}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-[26px]">
        <PageHeader title="New admissions" subtitle={data.yearLabel} />
      </div>
      {data.recentAdmissions.length === 0 ? (
        <Card>
          <p className="m-0 text-muted">No admissions yet. Enrol the first child from Admissions.</p>
        </Card>
      ) : (
        <Card>
          <Table
            columns={[
              {
                header: 'Child',
                cell: (row) => (
                  <div className="flex items-center gap-2.5 font-bold">
                    <Avatar
                      name={row.firstName}
                      index={data.recentAdmissions.findIndex((item) => item.id === row.id)}
                    />
                    {row.firstName} {row.lastName}
                  </div>
                ),
              },
              { header: 'Admission no.', cell: (row) => row.admissionNo },
              {
                header: 'Class',
                cell: (row) =>
                  row.rollNo != null
                    ? `${row.className} · Roll ${String(row.rollNo).padStart(2, '0')}`
                    : row.className,
              },
              { header: 'Parent', cell: (row) => row.parentName },
              { header: 'Status', cell: (row) => statusPill(row.status) },
            ]}
            rows={data.recentAdmissions}
            rowKey={(row) => row.id}
          />
        </Card>
      )}
    </>
  )
}
