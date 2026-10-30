import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pill, type PillTone } from '@/components/ui/Pill'
import { CreateSchoolForm } from '@/features/schools/CreateSchoolForm'
import { api, ApiError } from '@/lib/api'
import { formatDate } from '@/lib/dates'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

type DemoStatus = 'new' | 'converted' | 'dismissed'

type DemoRow = {
  id: string
  schoolName: string
  contactName: string
  phone: string
  email: string
  note: string | null
  status: DemoStatus
  convertedSchoolId: string | null
  convertedSchoolName: string | null
  createdAt: string
}

type Payload = {
  requests: DemoRow[]
  unread: number
}

const FILTERS = ['new', 'converted', 'dismissed', 'all'] as const
type Filter = (typeof FILTERS)[number]

const statusTone: Record<DemoStatus, PillTone> = {
  new: 'warn',
  converted: 'success',
  dismissed: 'info',
}

const statusLabel: Record<DemoStatus, string> = {
  new: 'New',
  converted: 'School created',
  dismissed: 'Dismissed',
}

export function DemoRequestsPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<Filter>('new')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createdId, setCreatedId] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['demo-requests'],
    queryFn: () => api<Payload>('/api/demo-requests'),
  })

  const dismiss = useMutation({
    mutationFn: (id: string) =>
      api(`/api/demo-requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'dismissed' }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['demo-requests'] })
    },
  })

  const rows = query.data?.requests ?? []
  const counts = useMemo(() => {
    const map = { new: 0, converted: 0, dismissed: 0, all: rows.length }
    for (const row of rows) map[row.status] += 1
    return map
  }, [rows])

  const filtered = rows.filter((row) => (filter === 'all' ? true : row.status === filter))
  const selected =
    rows.find((row) => row.id === createdId) ??
    filtered.find((row) => row.id === selectedId) ??
    filtered[0] ??
    null

  if (query.isLoading) {
    return <p className="text-muted">Loading demo requests…</p>
  }
  if (query.error || !query.data) {
    return (
      <Card>
        <p className="m-0 text-danger">
          {query.error instanceof ApiError ? query.error.message : 'Could not load demo requests.'}
        </p>
      </Card>
    )
  }

  return (
    <>
      <PageHeader
        title="Demo requests"
        subtitle="Schools that asked for a trial from the landing page"
      />
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {FILTERS.map((value) => (
          <Chip key={value} active={filter === value} onClick={() => setFilter(value)}>
            {value === 'all' ? 'All' : statusLabel[value]} · {counts[value]}
          </Chip>
        ))}
      </div>
      {rows.length === 0 ? (
        <Card>
          <p className="m-0 text-muted">
            No demo requests yet. When a school fills Request a demo on the landing page, it will
            show up here so you can create their login.
          </p>
        </Card>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <div className="grid gap-2">
            {filtered.length === 0 ? (
              <Card>
                <p className="m-0 text-muted">Nothing in this list. Pick another filter.</p>
              </Card>
            ) : (
              filtered.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className={`flex w-full items-center gap-3 rounded-[14px] border-2 bg-surface px-3 py-2.5 text-left ${
                    selected?.id === row.id ? 'border-primary bg-primary-tint' : 'border-line'
                  }`}
                  onClick={() => setSelectedId(row.id)}
                >
                  <div className="min-w-0 flex-1">
                    <b>{row.schoolName}</b>
                    <small className="block font-semibold text-muted">
                      {row.contactName} · {row.email}
                    </small>
                  </div>
                  <div className="text-right">
                    <Pill tone={statusTone[row.status]}>{statusLabel[row.status]}</Pill>
                    <small className="block font-semibold text-muted">{formatDate(row.createdAt)}</small>
                  </div>
                </button>
              ))
            )}
          </div>
          {selected ? (
            <div className="grid gap-4">
              <Card className="grid gap-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="mt-0 mb-1">{selected.schoolName}</h3>
                    <p className="m-0 text-muted">
                      {selected.contactName} asked for a demo on {formatDate(selected.createdAt)}
                    </p>
                  </div>
                  <Pill tone={statusTone[selected.status]}>{statusLabel[selected.status]}</Pill>
                </div>
                <dl className="m-0 grid grid-cols-[120px_1fr] gap-x-3 gap-y-1.5">
                  <dt className="font-bold text-muted">Phone</dt>
                  <dd className="m-0 font-bold">{selected.phone}</dd>
                  <dt className="font-bold text-muted">Email</dt>
                  <dd className="m-0 font-bold">{selected.email}</dd>
                  {selected.note ? (
                    <>
                      <dt className="font-bold text-muted">Note</dt>
                      <dd className="m-0 font-bold">{selected.note}</dd>
                    </>
                  ) : null}
                  {selected.convertedSchoolName ? (
                    <>
                      <dt className="font-bold text-muted">School</dt>
                      <dd className="m-0 font-bold">{selected.convertedSchoolName}</dd>
                    </>
                  ) : null}
                </dl>
                {selected.status === 'new' ? (
                  <div>
                    <Button
                      variant="alt"
                      disabled={dismiss.isPending}
                      onClick={() => dismiss.mutate(selected.id)}
                    >
                      Dismiss
                    </Button>
                  </div>
                ) : null}
              </Card>
              {selected.status === 'new' || createdId === selected.id ? (
                <CreateSchoolForm
                  key={selected.id}
                  defaults={{
                    demoRequestId: selected.id,
                    name: selected.schoolName,
                    phone: selected.phone,
                    email: selected.email,
                    adminName: selected.contactName,
                    adminEmail: selected.email,
                    adminPhone: selected.phone,
                  }}
                  onCreated={() => {
                    setCreatedId(selected.id)
                    void queryClient.invalidateQueries({ queryKey: ['demo-requests'] })
                    void queryClient.invalidateQueries({ queryKey: ['platform-schools'] })
                  }}
                  onDone={() => {
                    setCreatedId(null)
                    void queryClient.invalidateQueries({ queryKey: ['demo-requests'] })
                  }}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </>
  )
}
