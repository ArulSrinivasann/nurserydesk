import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { Field, Input, Select, Textarea } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pill, type PillTone } from '@/components/ui/Pill'
import { StatCard } from '@/components/ui/StatCard'
import { useToast } from '@/components/ui/Toast'
import {
  ENQUIRY_SOURCES,
  ENQUIRY_STATUSES,
  whatsappHref,
  type EnquirySource,
  type EnquiryStatus,
} from '@/lib/admissions'
import { api, ApiError } from '@/lib/api'
import { formatDate } from '@/lib/dates'
import { zodResolver } from '@/lib/zodResolver'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'

type EnquiryRow = {
  id: string
  childName: string
  parentName: string
  phone: string
  classInterest: string | null
  source: EnquirySource
  status: EnquiryStatus
  followUpLabel: string
  lostReason: string | null
  notes: Array<{ id: string; note: string; createdAt: string; authorName: string }>
}

type Payload = {
  enquiries: EnquiryRow[]
  stats: {
    open: number
    dueToday: number
    visitsBooked: number
    converted: number
    conversionPct: number
    total: number
  }
}

const schema = z.object({
  childName: z.string().trim().min(1, 'Enter the child’s name'),
  parentName: z.string().trim().min(1, 'Enter the parent’s name'),
  phone: z.string().trim().min(1, 'Enter a phone number'),
  classInterest: z.string(),
  source: z.string().min(1, 'Pick a source'),
  notes: z.string(),
})

type Values = z.infer<typeof schema>

const statusTone: Record<EnquiryStatus, PillTone> = {
  New: 'info',
  'Follow-up': 'warn',
  'Visit booked': 'success',
  Converted: 'success',
  Lost: 'danger',
}

export function EnquiriesPage() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState<'All' | EnquiryStatus>('All')
  const [queryText, setQueryText] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [note, setNote] = useState('')

  const query = useQuery({
    queryKey: ['enquiries'],
    queryFn: () => api<Payload>('/api/enquiries'),
  })
  const classesQuery = useQuery({
    queryKey: ['classes'],
    queryFn: () => api<{ classes: Array<{ name: string }> }>('/api/classes'),
  })

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['enquiries'] })

  const create = useMutation({
    mutationFn: (values: Values) => api('/api/enquiries', { method: 'POST', body: JSON.stringify(values) }),
    onSuccess: () => {
      toast('Enquiry added')
      setAdding(false)
      refresh()
    },
  })
  const setStatus = useMutation({
    mutationFn: (payload: { id: string; status: EnquiryStatus }) =>
      api(`/api/enquiries/${payload.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: payload.status }),
      }),
    onSuccess: () => {
      toast('Status saved')
      refresh()
    },
  })
  const addNote = useMutation({
    mutationFn: (id: string) =>
      api(`/api/enquiries/${id}/notes`, { method: 'POST', body: JSON.stringify({ note }) }),
    onSuccess: () => {
      toast('Follow-up logged')
      setNote('')
      refresh()
    },
  })
  const bookVisit = useMutation({
    mutationFn: (id: string) => api(`/api/enquiries/${id}/visit`, { method: 'POST' }),
    onSuccess: () => {
      toast('Visit booked. Confirmation sent to parent')
      refresh()
    },
  })

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      childName: '',
      parentName: '',
      phone: '',
      classInterest: '',
      source: 'Walk-in',
      notes: '',
    },
  })

  const rows = query.data?.enquiries ?? []
  const counts = useMemo(() => {
    const map = Object.fromEntries(ENQUIRY_STATUSES.map((status) => [status, 0])) as Record<EnquiryStatus, number>
    for (const row of rows) map[row.status] += 1
    return map
  }, [rows])

  const filtered = rows.filter((row) => {
    if (filter !== 'All' && row.status !== filter) return false
    const q = queryText.trim().toLowerCase()
    if (!q) return true
    return (
      row.childName.toLowerCase().includes(q) ||
      row.parentName.toLowerCase().includes(q) ||
      row.phone.replaceAll(' ', '').includes(q.replaceAll(' ', ''))
    )
  })
  const selected =
    filtered.find((row) => row.id === selectedId) ??
    filtered.find((row) => row.status !== 'Converted' && row.status !== 'Lost') ??
    filtered[0] ??
    null
  const open = selected && selected.status !== 'Converted' && selected.status !== 'Lost'

  if (query.isLoading) {
    return <p className="text-muted">Loading enquiries…</p>
  }
  if (query.error || !query.data) {
    return (
      <Card>
        <p className="m-0 text-danger">
          {query.error instanceof ApiError ? query.error.message : 'Could not load enquiries.'}
        </p>
      </Card>
    )
  }

  const stats = query.data.stats
  const classNames = classesQuery.data?.classes.map((row) => row.name) ?? []

  return (
    <>
      <PageHeader
        title="Enquiries"
        subtitle="Track every enquiry from first call to admission"
        action={
          <Button variant={adding ? 'alt' : 'primary'} onClick={() => setAdding((value) => !value)}>
            {adding ? 'Close' : '+ New enquiry'}
          </Button>
        }
      />
      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
        <StatCard label="Open enquiries" value={String(stats.open)} hint="New, follow-up and visits" trend="up" />
        <StatCard
          label="Follow-ups due today"
          value={String(stats.dueToday)}
          hint="Call or message today"
          trend="down"
        />
        <StatCard label="Visits booked" value={String(stats.visitsBooked)} hint="This week" trend="up" />
        <StatCard
          label="Converted"
          value={`${stats.conversionPct}%`}
          hint={`${stats.converted} of ${stats.total} enquiries`}
          trend="up"
        />
      </div>
      {adding ? (
        <Card className="mb-4">
          <h3 className="mb-3">New enquiry</h3>
          <form
            className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5"
            onSubmit={form.handleSubmit((values) => create.mutate(values))}
          >
            <Field id="childName" label="Child’s name" error={form.formState.errors.childName?.message}>
              <Input id="childName" placeholder="Aanya Sharma" autoComplete="off" {...form.register('childName')} />
            </Field>
            <Field id="parentName" label="Parent’s name" error={form.formState.errors.parentName?.message}>
              <Input id="parentName" placeholder="Rahul Sharma" autoComplete="off" {...form.register('parentName')} />
            </Field>
            <Field id="phone" label="Phone" error={form.formState.errors.phone?.message}>
              <Input id="phone" type="tel" placeholder="+91 98765 43210" autoComplete="off" {...form.register('phone')} />
            </Field>
            <Field id="classInterest" label="Class interested in">
              <Select id="classInterest" {...form.register('classInterest')}>
                <option value="">Not sure yet</option>
                {classNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="source" label="How did they hear about us?">
              <Select id="source" {...form.register('source')}>
                {ENQUIRY_SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="notes" label="Notes" className="col-span-full">
              <Input id="notes" placeholder="Asked about January intake" {...form.register('notes')} />
            </Field>
            <div className="col-span-full flex flex-wrap items-center justify-between gap-3">
              <span className="text-muted">A follow-up reminder is set for today.</span>
              <Button type="submit" disabled={create.isPending}>
                Save enquiry
              </Button>
            </div>
            {create.error instanceof ApiError ? (
              <p className="col-span-full m-0 text-[13px] text-danger">{create.error.message}</p>
            ) : null}
          </form>
        </Card>
      ) : null}
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
          <Chip active={filter === 'All'} onClick={() => setFilter('All')}>
            All · {rows.length}
          </Chip>
          {ENQUIRY_STATUSES.map((status) => (
            <Chip key={status} active={filter === status} onClick={() => setFilter(status)}>
              {status} · {counts[status]}
            </Chip>
          ))}
        </div>
        <Field id="eqq" label="Search enquiries" className="min-w-[240px]">
          <Input
            id="eqq"
            value={queryText}
            autoComplete="off"
            placeholder="Search by child, parent or phone"
            onChange={(event) => setQueryText(event.target.value)}
          />
        </Field>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="grid gap-2">
          {filtered.length === 0 ? (
            <Card>
              <p className="m-0 text-muted">No enquiries match. Clear the search or pick another status.</p>
            </Card>
          ) : (
            filtered.map((row, index) => (
              <button
                key={row.id}
                type="button"
                className={`srow flex w-full items-center gap-3 rounded-[14px] border-2 bg-surface px-3 py-2.5 text-left ${
                  selected?.id === row.id ? 'border-primary bg-primary-tint' : 'border-line'
                }`}
                onClick={() => setSelectedId(row.id)}
              >
                <Avatar name={row.childName} index={index} />
                <div className="min-w-0 flex-1">
                  <b>{row.childName}</b>
                  <small className="block font-semibold text-muted">
                    {row.parentName} · {row.classInterest ?? 'Class not set'} · {row.source}
                  </small>
                </div>
                <div className="text-right">
                  <Pill tone={statusTone[row.status]}>{row.status}</Pill>
                  <small className="block font-semibold text-muted">{row.followUpLabel}</small>
                </div>
              </button>
            ))
          )}
        </div>
        {selected ? (
          <Card className="grid gap-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Avatar name={selected.childName} index={filtered.indexOf(selected)} />
                <div>
                  <h3>{selected.childName}</h3>
                  <small className="font-semibold text-muted">
                    {selected.classInterest ?? 'Class not set'} · {selected.source} enquiry
                  </small>
                </div>
              </div>
              <Pill tone={statusTone[selected.status]}>{selected.status}</Pill>
            </div>
            <dl className="m-0 grid grid-cols-[140px_1fr] gap-x-3 gap-y-1.5">
              <dt className="font-bold text-muted">Parent</dt>
              <dd className="m-0 font-bold">{selected.parentName}</dd>
              <dt className="font-bold text-muted">Phone</dt>
              <dd className="m-0 font-bold">{selected.phone}</dd>
              <dt className="font-bold text-muted">Next follow-up</dt>
              <dd className="m-0 font-bold">{selected.followUpLabel}</dd>
            </dl>
            <div className="flex flex-wrap gap-2">
              <Button variant="alt" onClick={() => window.open(`tel:${selected.phone.replaceAll(' ', '')}`)}>
                Call
              </Button>
              <Button variant="alt" onClick={() => window.open(whatsappHref(selected.phone), '_blank')}>
                WhatsApp
              </Button>
            </div>
            <Field id="eqst" label="Status">
              <Select
                id="eqst"
                value={selected.status}
                onChange={(event) =>
                  setStatus.mutate({ id: selected.id, status: event.target.value as EnquiryStatus })
                }
              >
                {ENQUIRY_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </Field>
            <div>
              <h3 className="mb-2.5 text-base">Follow-up history</h3>
              {selected.notes.length === 0 ? (
                <p className="m-0 text-muted">No notes yet. Log the first follow-up.</p>
              ) : (
                <ul className="m-0 grid list-none gap-3.5 p-0">
                  {selected.notes.map((item) => (
                    <li key={item.id} className="flex gap-3">
                      <span className="w-14 shrink-0 text-[13px] font-bold text-muted">
                        {formatDate(item.createdAt)}
                      </span>
                      <div>
                        <b>{item.authorName}</b>
                        <div className="text-muted">{item.note}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Field id="eqn" label="Add a follow-up note">
              <Textarea
                id="eqn"
                rows={2}
                placeholder="What did the parent say?"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </Field>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button variant="alt" disabled={addNote.isPending} onClick={() => addNote.mutate(selected.id)}>
                Log follow-up
              </Button>
              {open ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="alt" onClick={() => bookVisit.mutate(selected.id)}>
                    Book school visit
                  </Button>
                  <Button
                    onClick={() => {
                      void navigate(`/admin/admissions/new?enquiry=${selected.id}`)
                      toast('Details carried over from the enquiry')
                    }}
                  >
                    Convert to admission
                  </Button>
                </div>
              ) : null}
            </div>
            {selected.lostReason ? <p className="m-0 text-muted">{selected.lostReason}</p> : null}
          </Card>
        ) : null}
      </div>
    </>
  )
}
