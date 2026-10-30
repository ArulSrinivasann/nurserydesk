import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pill } from '@/components/ui/Pill'
import { PrintSheet } from '@/components/ui/PrintSheet'
import { StatCard } from '@/components/ui/StatCard'
import { childName, LevelMeter, LevelPill, Trend } from '@/features/progress/bits'
import { api, ApiError } from '@/lib/api'
import { levelLabel } from '@/lib/attendance'
import { formatINR } from '@/lib/money'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'

type HomePayload = {
  children: Array<{ id: string; firstName: string; lastName: string | null }>
  child: {
    id: string
    firstName: string
    lastName: string | null
    className: string
    teacherName: string | null
    presentToday: boolean | null
  } | null
  attendance?: {
    pct: number | null
    presentDays: number
    workingDays: number
    monthLabel: string
  }
  feeBalancePaise?: number
  feeDueLabel?: string
  learningStars?: number
  learningStarsDelta?: number
  timeline?: Array<{ id: string; time: string; body: string }>
  announcements?: Array<{ id: string; title: string; body: string; kind: 'event' | 'holiday' | 'alert' }>
  reportCards?: Array<{ termId: string; label: string; overall: number; overallLabel: string; isCurrent: boolean }>
}

type ReportPayload = {
  school: { name: string; address: string | null; yearLabel: string } | null
  term: { id: string; label: string }
  previousTerm: { id: string; label: string } | null
  issued: string
  student: {
    firstName: string
    lastName: string | null
    className: string
    rollNo: number | null
    teacherName: string
    attendancePct: number | null
    overall: number
    remark: string
    areas: Array<{
      area: string
      level: number
      previousLevel: number
      trend: 'improved' | 'dropped' | 'no_change'
    }>
  }
}

export function ParentHomePage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const studentId = params.get('studentId')
  const termId = params.get('term')
  const home = useQuery({
    queryKey: ['parent-home', studentId],
    queryFn: () => api<HomePayload>(`/api/parent/home${studentId ? `?studentId=${studentId}` : ''}`),
  })
  const report = useQuery({
    queryKey: ['parent-report', home.data?.child?.id, termId],
    enabled: Boolean(home.data?.child?.id && termId),
    queryFn: () =>
      api<ReportPayload>(`/api/parent/report?studentId=${home.data?.child?.id}&termId=${termId}`),
  })

  if (home.isLoading) {
    return <p className="text-muted">Loading your child’s day…</p>
  }
  if (home.error || !home.data) {
    return (
      <Card>
        <p className="m-0 text-danger">
          {home.error instanceof ApiError ? home.error.message : 'Could not load the parent home.'}
        </p>
      </Card>
    )
  }

  if (!home.data.child) {
    return (
      <Card>
        <p className="m-0 text-muted">Ask the school office to link your login to your child.</p>
      </Card>
    )
  }

  const data = home.data
  const child = home.data.child
  const due = data.feeBalancePaise ?? 0

  if (termId) {
    if (report.isLoading) return <p className="text-muted">Loading the report card…</p>
    if (report.error || !report.data) {
      return (
        <Card>
          <p className="m-0 text-danger">
            {report.error instanceof ApiError ? report.error.message : 'Could not load the report card.'}
          </p>
        </Card>
      )
    }
    const card = report.data
    return (
      <>
        <div data-print-hide>
          <PageHeader
            title="Report card"
            subtitle={card.term.label}
            action={
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => window.print()}>Print report</Button>
                <Button variant="alt" onClick={() => setParams(studentId ? { studentId } : {})}>
                  Back to my child
                </Button>
              </div>
            }
          />
        </div>
        <PrintSheet
          title="Progress report"
          schoolName={card.school?.name ?? 'School'}
          schoolAddress={card.school?.address}
          issued={`${card.term.label} · ${card.school?.yearLabel ?? ''} · Issued ${card.issued}`}
        >
          <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-2">
            {[
              ['Student', childName(card.student)],
              ['Class', card.student.className],
              ['Roll no.', String(card.student.rollNo ?? 0).padStart(2, '0')],
              ['Teacher', card.student.teacherName],
              ['Attendance', card.student.attendancePct == null ? '—' : `${card.student.attendancePct}%`],
              ['Overall', levelLabel(card.student.overall)],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-2">
                <dt className="min-w-[92px] text-[#555]">{label}</dt>
                <dd className="m-0 font-bold">{value}</dd>
              </div>
            ))}
          </dl>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border-b-2 border-[#1b1b1b] px-2 py-2 text-left text-[#555]">Learning area</th>
                <th className="border-b-2 border-[#1b1b1b] px-2 py-2 text-left text-[#555]">Progress</th>
                <th className="border-b-2 border-[#1b1b1b] px-2 py-2 text-left text-[#555]">This term</th>
                <th className="border-b-2 border-[#1b1b1b] px-2 py-2 text-left text-[#555]">
                  Since {card.previousTerm?.label ?? 'last term'}
                </th>
              </tr>
            </thead>
            <tbody>
              {card.student.areas.map((area) => (
                <tr key={area.area}>
                  <td className="border-b border-[#e5e5e5] px-2 py-2">{area.area}</td>
                  <td className="border-b border-[#e5e5e5] px-2 py-2">
                    <LevelMeter level={area.level} />
                  </td>
                  <td className="border-b border-[#e5e5e5] px-2 py-2">
                    <LevelPill level={area.level} />
                  </td>
                  <td className="border-b border-[#e5e5e5] px-2 py-2">
                    <Trend value={area.trend} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div>
            <b>Teacher’s remarks</b>
            <div className="mt-1">{card.student.remark || 'No remarks yet.'}</div>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            {['Class teacher', 'Principal', 'Parent'].map((label) => (
              <div key={label} className="mt-8 min-w-[170px] border-t border-[#1b1b1b] pt-1 text-center text-xs text-[#555]">
                {label}
              </div>
            ))}
          </div>
        </PrintSheet>
      </>
    )
  }

  return (
    <>
      {data.children.length > 1 ? (
        <div className="mb-3.5 flex flex-wrap gap-1.5" role="group" aria-label="Your children">
          {data.children.map((row) => (
            <Chip
              key={row.id}
              active={row.id === child.id}
              onClick={() => setParams({ studentId: row.id })}
            >
              {childName(row)}
            </Chip>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-[18px] rounded-[24px] bg-ink p-[22px] text-bg">
        <Avatar name={child.firstName} size="lg" />
        <div className="min-w-[180px] flex-1">
          <h2 className="text-bg">{childName(child)}</h2>
          <div className="opacity-80">
            {child.className}
            {child.teacherName ? ` · Teacher ${child.teacherName}` : ''}
          </div>
        </div>
        {child.presentToday == null ? (
          <Pill>Register not saved</Pill>
        ) : child.presentToday ? (
          <Pill tone="success">Present today</Pill>
        ) : (
          <Pill tone="danger">Absent today</Pill>
        )}
      </div>
      <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
        <StatCard
          label={`Attendance (${data.attendance?.monthLabel ?? ''})`}
          value={data.attendance?.pct == null ? '—' : `${data.attendance.pct}%`}
          hint={
            data.attendance
              ? `${data.attendance.presentDays} of ${data.attendance.workingDays} days`
              : 'No register this month'
          }
          trend={(data.attendance?.pct ?? 0) >= 90 ? 'up' : 'down'}
        />
        <StatCard
          label="Fee balance"
          value={formatINR(due)}
          hint={data.feeDueLabel ?? 'Paid up'}
          trend={due > 0 ? 'down' : 'up'}
        />
        <StatCard
          label="Learning stars"
          value={String(data.learningStars ?? 0)}
          hint={
            (data.learningStarsDelta ?? 0) > 0
              ? `+${data.learningStarsDelta} this term`
              : (data.learningStarsDelta ?? 0) < 0
                ? `${data.learningStarsDelta} this term`
                : 'Same as last term'
          }
          trend={(data.learningStarsDelta ?? 0) >= 0 ? 'up' : 'down'}
        />
      </div>
      <div className="mt-[26px] grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h3>Today at school</h3>
          {data.timeline && data.timeline.length > 0 ? (
            <ul className="mt-3.5 mb-0 grid list-none gap-3.5 p-0">
              {data.timeline.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <span className="w-14 shrink-0 text-[13px] font-bold text-muted">{item.time}</span>
                  <div>{item.body}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-0 mt-3.5 text-muted">No updates yet today. Check back after school.</p>
          )}
        </Card>
        <Card>
          <h3>Announcements</h3>
          {data.announcements && data.announcements.length > 0 ? (
            <div className="mt-3 grid gap-3">
              {data.announcements.map((row) => (
                <div key={row.id}>
                  <Pill tone={row.kind === 'holiday' ? 'warn' : row.kind === 'alert' ? 'danger' : 'info'}>
                    {row.kind === 'holiday' ? 'Holiday' : row.kind === 'alert' ? 'Alert' : 'Event'}
                  </Pill>{' '}
                  <b>{row.title}</b>
                  <div className="text-muted">{row.body}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mb-0 mt-3.5 text-muted">No announcements right now.</p>
          )}
          {due > 0 ? (
            <Button className="mt-3.5" onClick={() => void navigate(`/parent/fees?studentId=${child.id}`)}>
              Pay {formatINR(due)}
            </Button>
          ) : null}
        </Card>
      </div>
      <div className="mt-[26px]">
        <PageHeader title="Report cards" subtitle="Open a term to print the same report the teacher sees." />
      </div>
      {data.reportCards && data.reportCards.length > 0 ? (
        <Card>
          <div className="grid gap-3">
            {data.reportCards.map((row) => (
              <div key={row.termId} className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <b>{row.label}</b>
                  <div className="text-muted">
                    Overall {row.overallLabel}
                    {row.isCurrent ? ' · Current term' : ''}
                  </div>
                </div>
                <Button
                  variant="alt"
                  onClick={() =>
                    setParams(studentId ? { studentId, term: row.termId } : { term: row.termId })
                  }
                >
                  Open report
                </Button>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card>
          <p className="m-0 text-muted">No report cards yet. They appear here after the teacher saves progress.</p>
        </Card>
      )}
    </>
  )
}
