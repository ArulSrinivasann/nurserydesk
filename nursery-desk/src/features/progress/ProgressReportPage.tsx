import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { Select } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { PrintSheet } from '@/components/ui/PrintSheet'
import { useToast } from '@/components/ui/Toast'
import { useTeacherClass } from '@/features/attendance/useTeacherClass'
import { childName, LevelMeter, LevelPill, Trend } from '@/features/progress/bits'
import type { ProgressPayload } from '@/features/progress/types'
import { api, ApiError } from '@/lib/api'
import { LEARNING_AREAS, formatWeekdayDate, levelLabel } from '@/lib/attendance'
import { downloadCsv } from '@/lib/csv'
import { formatDate } from '@/lib/dates'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

export function ProgressReportPage() {
  const { toast } = useToast()
  const [params, setParams] = useSearchParams()
  const { query: classQuery, classId, className } = useTeacherClass()
  const query = useQuery({
    queryKey: ['teacher-progress', classId],
    enabled: Boolean(classId),
    queryFn: () => api<ProgressPayload>(`/api/teacher/progress?classId=${classId}`),
  })
  const mode = params.get('mode') === 'child' || params.get('child') ? 'child' : 'class'
  const requestedChild = params.get('child')
  const [childId, setChildId] = useState(requestedChild ?? '')

  const child = useMemo(() => {
    const students = query.data?.students ?? []
    return students.find((row) => row.id === (childId || requestedChild)) ?? students[0]
  }, [query.data, childId, requestedChild])

  if (classQuery.isLoading || query.isLoading) {
    return <p className="text-muted">Loading the progress report…</p>
  }
  if (!classId) {
    return (
      <Card>
        <p className="m-0 text-muted">No class is assigned to you yet. Ask the school admin to assign a class.</p>
      </Card>
    )
  }
  if (query.error || !query.data) {
    return (
      <Card>
        <p className="m-0 text-danger">
          {query.error instanceof ApiError ? query.error.message : 'Could not load the progress report.'}
        </p>
      </Card>
    )
  }

  const data = query.data
  const support = data.students
    .map((row) => ({
      name: childName(row),
      areas: row.areas.filter((area) => area.level === 1).map((area) => area.area),
    }))
    .filter((row) => row.areas.length > 0)
  const issued = `Issued ${formatDate(new Date())}`

  return (
    <>
      <div data-print-hide>
        <PageHeader
          title="Progress report"
          subtitle={`${className} · ${data.term.label}`}
          action={
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => window.print()}>Print report</Button>
              <Button
                variant="alt"
                onClick={() => {
                  window.print()
                  toast('Report saved as PDF')
                }}
              >
                Download PDF
              </Button>
              {mode === 'class' ? (
                <Button
                  variant="alt"
                  onClick={() => {
                    downloadCsv(
                      `progress-${data.class.name}.csv`,
                      ['Roll', 'Child', ...LEARNING_AREAS],
                      data.students.map((row) => [
                        String(row.rollNo ?? 0).padStart(2, '0'),
                        childName(row),
                        ...row.areas.map((area) => levelLabel(area.level)),
                      ]),
                    )
                    toast('Excel file downloaded')
                  }}
                >
                  Export to Excel
                </Button>
              ) : (
                <Button variant="alt" onClick={() => toast('Report shared with parent')}>
                  Share with parent
                </Button>
              )}
            </div>
          }
        />
        <div className="mb-4 flex flex-wrap gap-2">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Report type">
            <Chip
              active={mode === 'class'}
              onClick={() => {
                setParams({})
              }}
            >
              Class summary
            </Chip>
            <Chip
              active={mode === 'child'}
              onClick={() => setParams({ mode: 'child', child: child?.id ?? '' })}
            >
              Child report card
            </Chip>
          </div>
          {mode === 'child' ? (
            <Select
              aria-label="Child"
              value={child?.id ?? ''}
              onChange={(event) => {
                setChildId(event.target.value)
                setParams({ mode: 'child', child: event.target.value })
              }}
            >
              {data.students.map((row) => (
                <option key={row.id} value={row.id}>
                  {childName(row)}
                </option>
              ))}
            </Select>
          ) : null}
        </div>
      </div>

      {mode === 'class' ? (
        <PrintSheet
          title="Class progress summary"
          schoolName={data.school.name}
          schoolAddress={data.school.address}
          issued={`${data.term.label} · ${data.school.yearLabel} · ${issued}`}
        >
          <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-2">
            <div className="flex gap-2">
              <dt className="min-w-[92px] text-[#555]">Class</dt>
              <dd className="m-0 font-bold">{data.class.name}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="min-w-[92px] text-[#555]">Teacher</dt>
              <dd className="m-0 font-bold">{data.class.teacherName}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="min-w-[92px] text-[#555]">Children</dt>
              <dd className="m-0 font-bold">
                {data.assessed} assessed of {data.total}
              </dd>
            </div>
          </dl>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border-b-2 border-[#1b1b1b] px-2 py-2 text-left text-[#555]">Roll</th>
                  <th className="border-b-2 border-[#1b1b1b] px-2 py-2 text-left text-[#555]">Child</th>
                  {LEARNING_AREAS.map((area) => (
                    <th key={area} className="border-b-2 border-[#1b1b1b] px-2 py-2 text-left text-[#555]">
                      {area}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.students.map((row) => (
                  <tr key={row.id}>
                    <td className="border-b border-[#e5e5e5] px-2 py-2">{String(row.rollNo ?? 0).padStart(2, '0')}</td>
                    <td className="border-b border-[#e5e5e5] px-2 py-2">
                      <b>{childName(row)}</b>
                    </td>
                    {row.areas.map((area) => (
                      <td key={area.area} className="border-b border-[#e5e5e5] px-2 py-2">
                        <LevelPill level={area.level} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <b>Children who need extra support</b>
            {support.length === 0 ? (
              <div>None this term.</div>
            ) : (
              <ul className="mt-1.5 mb-0 pl-[18px]">
                {support.map((row) => (
                  <li key={row.name}>
                    {row.name}: {row.areas.join(', ')}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <span className="text-xs text-[#555]">Levels: Beginning, Developing, Secure, Excelling.</span>
        </PrintSheet>
      ) : child ? (
        <PrintSheet
          title="Progress report"
          schoolName={data.school.name}
          schoolAddress={data.school.address}
          issued={`${data.term.label} · ${data.school.yearLabel} · ${issued}`}
        >
          <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-2">
            {[
              ['Student', childName(child)],
              ['Class', data.class.name],
              ['Roll no.', String(child.rollNo ?? 0).padStart(2, '0')],
              ['Teacher', data.class.teacherName],
              ['Attendance', `${child.attendancePct}%`],
              ['Overall', levelLabel(child.overall)],
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
                  Since {data.previousTerm?.label ?? 'last term'}
                </th>
              </tr>
            </thead>
            <tbody>
              {child.areas.map((area) => (
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
            <div className="mt-1">{child.remark || 'No remarks yet.'}</div>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            {['Class teacher', 'Principal', 'Parent'].map((label) => (
              <div key={label} className="mt-8 min-w-[170px] border-t border-[#1b1b1b] pt-1 text-center text-xs text-[#555]">
                {label}
              </div>
            ))}
          </div>
          <span className="text-xs text-[#555]">
            Levels: Beginning, Developing, Secure, Excelling. Reports are shared with parents through the Nursery Desk
            app.
          </span>
        </PrintSheet>
      ) : (
        <Card>
          <p className="m-0 text-muted">No children in this class yet.</p>
        </Card>
      )}
      <span className="sr-only">{formatWeekdayDate(new Date())}</span>
    </>
  )
}
