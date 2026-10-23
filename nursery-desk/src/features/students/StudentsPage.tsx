import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pill } from '@/components/ui/Pill'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Table } from '@/components/ui/Table'
import { api, ApiError } from '@/lib/api'
import { formatINR } from '@/lib/money'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

type ClassCard = {
  id: string
  name: string
  teacherName: string | null
  capacity: number
  childCount: number
}

type StudentRow = {
  id: string
  firstName: string
  lastName: string | null
  admissionNo: string
  rollNo: number | null
  classId: string | null
  className: string
  parentName: string
  status: string
  attendancePct: number | null
  feeDuePaise: number | null
}

type Payload = {
  yearLabel: string
  classes: ClassCard[]
  students: StudentRow[]
}

function statusPill(status: string) {
  if (status === 'enrolled') return <Pill tone="success">Enrolled</Pill>
  if (status === 'documents_pending') return <Pill tone="warn">Documents pending</Pill>
  if (status === 'applied') return <Pill tone="info">Applied</Pill>
  return <Pill>{status}</Pill>
}

export function StudentsPage() {
  const navigate = useNavigate()
  const [classId, setClassId] = useState<string | 'all'>('all')
  const query = useQuery({
    queryKey: ['students'],
    queryFn: () => api<Payload>('/api/students'),
  })

  const students = query.data?.students ?? []
  const classes = query.data?.classes ?? []
  const visibleClasses = useMemo(
    () => (classId === 'all' ? classes : classes.filter((row) => row.id === classId)),
    [classId, classes],
  )
  const total = students.filter((row) => row.status !== 'withdrawn').length

  if (query.isLoading) {
    return <p className="text-muted">Loading students…</p>
  }
  if (query.error || !query.data) {
    return (
      <Card>
        <p className="m-0 text-danger">
          {query.error instanceof ApiError ? query.error.message : 'Could not load students.'}
        </p>
      </Card>
    )
  }

  return (
    <>
      <PageHeader
        title="Students"
        subtitle={`${total} children in ${classes.length} classes · ${query.data.yearLabel}`}
        action={<Button onClick={() => void navigate('/admin/admissions/new')}>+ New admission</Button>}
      />
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Filter by class">
        <Chip active={classId === 'all'} onClick={() => setClassId('all')}>
          All classes
        </Chip>
        {classes.map((row) => (
          <Chip key={row.id} active={classId === row.id} onClick={() => setClassId(row.id)}>
            {row.name} · {row.childCount}
          </Chip>
        ))}
      </div>
      {classes.length === 0 ? (
        <Card>
          <p className="m-0 text-muted">Add classes first, then enrol children here.</p>
        </Card>
      ) : (
        <div className="mb-2 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
          {classes.map((row) => {
            const full = row.capacity > 0 && row.childCount / row.capacity > 0.95
            return (
              <button
                key={row.id}
                type="button"
                className={`flex flex-col items-stretch gap-1.5 rounded-[14px] border-2 p-3 text-left ${
                  classId === row.id ? 'border-primary bg-primary-tint' : 'border-line bg-surface'
                }`}
                onClick={() => setClassId(row.id)}
              >
                <div className="flex justify-between gap-2">
                  <b>{row.name}</b>
                  <span className="font-bold">
                    {row.childCount}/{row.capacity}
                  </span>
                </div>
                <small className="font-semibold text-muted">
                  {row.teacherName ? `Class teacher: ${row.teacherName}` : 'No teacher assigned'}
                </small>
                <ProgressBar
                  value={row.childCount}
                  max={row.capacity}
                  tone={full ? 'danger' : 'success'}
                  label={row.name}
                />
              </button>
            )
          })}
        </div>
      )}
      {visibleClasses.map((klass) => {
        const rows = students
          .filter((row) => row.classId === klass.id)
          .sort((a, b) => (a.rollNo ?? 99) - (b.rollNo ?? 99))
        return (
          <div key={klass.id}>
            <PageHeader
              title={klass.name}
              subtitle={`${klass.teacherName ?? 'No teacher'} · ${klass.childCount} children`}
              action={
                classId === 'all' ? (
                  <Button variant="alt" onClick={() => setClassId(klass.id)}>
                    View class
                  </Button>
                ) : (
                  <Button variant="alt" onClick={() => setClassId('all')}>
                    Show all classes
                  </Button>
                )
              }
            />
            {rows.length === 0 ? (
              <Card className="mb-4">
                <p className="m-0 text-muted">No children in this class yet. Start a new admission.</p>
              </Card>
            ) : (
              <Card className="mb-4">
                <Table
                  columns={[
                    {
                      header: 'Roll',
                      cell: (row) => String(row.rollNo ?? 0).padStart(2, '0'),
                    },
                    {
                      header: 'Child',
                      cell: (row) => (
                        <div className="flex items-center gap-2.5 font-bold">
                          <Avatar
                            name={row.firstName}
                            index={rows.findIndex((item) => item.id === row.id)}
                          />
                          {row.firstName} {row.lastName}
                        </div>
                      ),
                    },
                    { header: 'Admission no.', cell: (row) => row.admissionNo },
                    { header: 'Parent', cell: (row) => row.parentName },
                    {
                      header: 'Attendance',
                      cell: (row) =>
                        row.attendancePct == null ? (
                          '—'
                        ) : (
                          <>
                            {row.attendancePct}%
                            {row.attendancePct < 75 ? (
                              <>
                                {' '}
                                <Pill tone="danger">Low</Pill>
                              </>
                            ) : null}
                          </>
                        ),
                    },
                    {
                      header: 'Fees',
                      cell: (row) =>
                        row.feeDuePaise == null ? (
                          '—'
                        ) : row.feeDuePaise > 0 ? (
                          <Pill tone="warn">{formatINR(row.feeDuePaise)} due</Pill>
                        ) : (
                          <Pill tone="success">Paid up</Pill>
                        ),
                    },
                    { header: 'Status', cell: (row) => statusPill(row.status) },
                  ]}
                  rows={rows}
                  rowKey={(row) => row.id}
                />
                <div className="pt-2.5 text-[13px] text-muted">
                  Showing {rows.length} of {klass.childCount} children
                </div>
              </Card>
            )}
          </div>
        )
      })}
    </>
  )
}
