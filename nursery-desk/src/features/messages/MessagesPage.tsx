import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pill, type PillTone } from '@/components/ui/Pill'
import { StatCard } from '@/components/ui/StatCard'
import { useToast } from '@/components/ui/Toast'
import { ComposeMessage } from '@/features/messages/ComposeMessage'
import { api, ApiError } from '@/lib/api'
import { formatDate } from '@/lib/dates'
import { formatINR, formatINRCompact } from '@/lib/money'
import { MESSAGE_KIND_LABEL, MESSAGE_KINDS, reminderPreview, type MessageKind, type ReminderTone } from '@/lib/messages'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'

type MessageRow = {
  id: string
  title: string
  body: string
  audience: string
  audienceLabel: string
  kind: MessageKind
  sentTo: number
  createdAt: string
}

type DueFamily = {
  studentId: string
  familyName: string
  parentName: string
  parentFirst: string
  childFirst: string
  childName: string
  className: string
  remainingPaise: number
  status: 'overdue' | 'due'
  dueOn: string | null
  dueLabel: string
}

type Payload = {
  schoolName: string
  monthLabel: string
  parentCount: number
  sample: { parentFirst: string; childFirst: string }
  classes: Array<{ id: string; name: string; parentCount: number }>
  parents: Array<{
    studentId: string
    parentFirst: string
    childFirst: string
    childName: string
    classId: string | null
    className: string
  }>
  messages: MessageRow[]
  dues: {
    families: DueFamily[]
    parentCount: number
    overdueCount: number
    pendingPaise: number
    remindersSent: number
    paidWithin3DaysPaise: number
  }
}

type Tab = 'compose' | 'payments' | 'history'

const kindTone: Record<MessageKind, PillTone> = {
  announcement: 'info',
  holiday: 'warn',
  alert: 'danger',
}

const AUTO_KEY = 'nd-fee-auto-reminders'

function readAutoReminders() {
  try {
    const raw = localStorage.getItem(AUTO_KEY)
    if (!raw) return { beforeDue: true, onDue: true }
    const parsed = JSON.parse(raw) as { beforeDue?: boolean; onDue?: boolean }
    return { beforeDue: parsed.beforeDue !== false, onDue: parsed.onDue !== false }
  } catch {
    return { beforeDue: true, onDue: true }
  }
}

export function MessagesPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('compose')
  const [filter, setFilter] = useState<'all' | MessageKind>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [picked, setPicked] = useState<string[] | null>(null)
  const [tone, setTone] = useState<ReminderTone>('friendly')
  const [auto, setAuto] = useState(readAutoReminders)

  const query = useQuery({
    queryKey: ['messages'],
    queryFn: () => api<Payload>('/api/messages'),
  })

  const families = query.data?.dues.families ?? []
  const selectedIds = picked ?? families.map((row) => row.studentId)
  const selectedFamilies = families.filter((row) => selectedIds.includes(row.studentId))

  useEffect(() => {
    localStorage.setItem(AUTO_KEY, JSON.stringify(auto))
  }, [auto])

  const remind = useMutation({
    mutationFn: () =>
      api<{ sent: number }>('/api/messages/reminders', {
        method: 'POST',
        body: JSON.stringify({ studentIds: selectedIds, tone }),
      }),
    onSuccess: async (result) => {
      toast(`Reminders sent to ${result.sent} ${result.sent === 1 ? 'family' : 'families'}`)
      await queryClient.invalidateQueries({ queryKey: ['messages'] })
    },
    onError: (error) => {
      toast(error instanceof ApiError ? error.message : 'Could not send reminders.')
    },
  })

  const rows = query.data?.messages ?? []
  const filtered = useMemo(
    () => (filter === 'all' ? rows : rows.filter((row) => row.kind === filter)),
    [filter, rows],
  )
  const selected = filtered.find((row) => row.id === selectedId) ?? filtered[0] ?? null

  if (query.isLoading) {
    return <p className="text-muted">Loading messages…</p>
  }
  if (query.error || !query.data) {
    return (
      <Card>
        <p className="m-0 text-danger">
          {query.error instanceof ApiError ? query.error.message : 'Could not load messages.'}
        </p>
      </Card>
    )
  }

  const { dues, schoolName, monthLabel } = query.data
  const sample = selectedFamilies[0] ?? families[0]
  const preview = sample
    ? reminderPreview({
        tone,
        parentFirst: sample.parentFirst,
        childFirst: sample.childFirst,
        amountPaise: sample.remainingPaise,
        dueOn: sample.dueOn,
        schoolName,
      })
    : 'Tick a family to preview the reminder.'
  const selectedTotal = selectedFamilies.reduce((sum, row) => sum + row.remainingPaise, 0)
  const allSelected = families.length > 0 && selectedIds.length === families.length
  const counts = {
    all: rows.length,
    announcement: rows.filter((row) => row.kind === 'announcement').length,
    holiday: rows.filter((row) => row.kind === 'holiday').length,
    alert: rows.filter((row) => row.kind === 'alert').length,
  }

  function toggleFamily(studentId: string) {
    const current = selectedIds
    setPicked(current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId])
  }

  return (
    <>
      <PageHeader
        title="Messages and alerts"
        subtitle="Reach every parent on WhatsApp and SMS"
        action={
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Messages views">
            <Chip active={tab === 'compose'} onClick={() => setTab('compose')}>
              New message
            </Chip>
            <Chip active={tab === 'payments'} onClick={() => setTab('payments')}>
              Payment alerts
            </Chip>
            <Chip active={tab === 'history'} onClick={() => setTab('history')}>
              History
            </Chip>
          </div>
        }
      />

      {tab === 'payments' ? (
        <>
          <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
            <StatCard
              label="Parents with dues"
              value={String(dues.parentCount)}
              hint={dues.parentCount === 0 ? 'Everyone is paid up' : `${formatINR(dues.pendingPaise)} pending`}
              trend={dues.parentCount > 0 ? 'down' : 'up'}
            />
            <StatCard
              label="Overdue"
              value={String(dues.overdueCount)}
              hint={dues.overdueCount === 0 ? 'No overdue invoices' : 'Send a notice'}
              trend={dues.overdueCount > 0 ? 'down' : 'up'}
            />
            <StatCard
              label={`Reminders sent (${monthLabel})`}
              value={String(dues.remindersSent)}
              hint={
                dues.paidWithin3DaysPaise > 0
                  ? `${formatINRCompact(dues.paidWithin3DaysPaise)} paid within 3 days`
                  : 'No payments in the last 3 days'
              }
              trend={dues.paidWithin3DaysPaise > 0 ? 'up' : 'neutral'}
            />
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-2">
            <Card>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3>Parents with pending fees</h3>
                {families.length > 0 ? (
                  <Button
                    variant="alt"
                    className="bg-nav-active-bg px-3 py-1.5 font-semibold text-nav-active"
                    onClick={() => setPicked(allSelected ? [] : families.map((row) => row.studentId))}
                  >
                    {allSelected ? 'Clear all' : 'Select all'}
                  </Button>
                ) : null}
              </div>
              {families.length === 0 ? (
                <p className="mb-0 mt-2 text-muted">Every family is paid up. No reminders to send.</p>
              ) : (
                <ul className="m-0 grid list-none gap-0 p-0">
                  {families.map((row, index) => {
                    const checked = selectedIds.includes(row.studentId)
                    return (
                      <li key={row.studentId} className="border-b border-line last:border-b-0">
                        <label className="flex cursor-pointer items-center gap-3 py-3">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-nav-active"
                            checked={checked}
                            onChange={() => toggleFamily(row.studentId)}
                          />
                          <Avatar name={row.familyName} index={index} />
                          <div className="min-w-0 flex-1">
                            <b>{row.familyName}</b>
                            <small className="block font-semibold text-muted">
                              {row.childName} · {row.className}
                            </small>
                          </div>
                          <div className="text-right">
                            <b>{formatINR(row.remainingPaise)}</b>
                            <div>
                              <Pill tone={row.status === 'overdue' ? 'danger' : 'warn'}>{row.dueLabel}</Pill>
                            </div>
                          </div>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>

            <div className="grid gap-4">
              <Card>
                <h3 className="mb-3">Send a reminder</h3>
                <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Reminder tone">
                  <Chip active={tone === 'friendly'} onClick={() => setTone('friendly')}>
                    Friendly reminder
                  </Chip>
                  <Chip active={tone === 'overdue'} onClick={() => setTone('overdue')}>
                    Overdue notice
                  </Chip>
                </div>
                <p className="m-0 rounded-[14px] bg-success-tint p-3.5 text-[15px] text-ink">{preview}</p>
                <div className="mt-3 mb-3.5 flex flex-wrap items-center justify-between gap-2 text-[13px] font-semibold text-muted">
                  <span>Sending via WhatsApp + SMS</span>
                  <span>
                    {selectedFamilies.length} {selectedFamilies.length === 1 ? 'parent' : 'parents'}
                    {selectedFamilies.length > 0 ? ` · ${formatINR(selectedTotal)}` : ''}
                  </span>
                </div>
                <Button
                  className="w-full"
                  disabled={remind.isPending || selectedFamilies.length === 0}
                  onClick={() => remind.mutate()}
                >
                  {remind.isPending ? 'Sending…' : 'Send reminders'}
                </Button>
              </Card>

              <Card>
                <h3>Automatic reminders</h3>
                <p className="mt-1 mb-3 text-muted">Send without lifting a finger.</p>
                <label className="mb-2 flex cursor-pointer items-center gap-2.5 font-semibold">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-nav-active"
                    checked={auto.beforeDue}
                    onChange={(event) => setAuto((current) => ({ ...current, beforeDue: event.target.checked }))}
                  />
                  3 days before the due date
                </label>
                <label className="flex cursor-pointer items-center gap-2.5 font-semibold">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-nav-active"
                    checked={auto.onDue}
                    onChange={(event) => setAuto((current) => ({ ...current, onDue: event.target.checked }))}
                  />
                  On the due date
                </label>
              </Card>
            </div>
          </div>
        </>
      ) : null}

      {tab === 'compose' ? (
        <ComposeMessage
          schoolName={query.data.schoolName}
          parentCount={query.data.parentCount}
          sample={query.data.sample}
          classes={query.data.classes}
          parents={query.data.parents}
        />
      ) : null}

      {tab === 'history' ? (
        <>
          <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Filter by type">
            <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
              All · {counts.all}
            </Chip>
            {MESSAGE_KINDS.map((kind) => (
              <Chip key={kind} active={filter === kind} onClick={() => setFilter(kind)}>
                {MESSAGE_KIND_LABEL[kind]} · {counts[kind]}
              </Chip>
            ))}
          </div>
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <div className="grid gap-2">
              {filtered.length === 0 ? (
                <Card>
                  <p className="m-0 text-muted">
                    {rows.length === 0
                      ? 'No messages yet. Send the first note from New message.'
                      : 'No messages match. Pick another type.'}
                  </p>
                </Card>
              ) : (
                filtered.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    className={`flex w-full items-start gap-3 rounded-[14px] border-2 bg-surface px-3 py-2.5 text-left ${
                      selected?.id === row.id
                        ? 'border-nav-active bg-nav-active-bg text-nav-active'
                        : 'border-line'
                    }`}
                    onClick={() => setSelectedId(row.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <b>{row.title}</b>
                      <small className="block font-semibold text-muted">
                        {row.audienceLabel} · {formatDate(row.createdAt)}
                      </small>
                    </div>
                    <Pill tone={kindTone[row.kind]}>{MESSAGE_KIND_LABEL[row.kind]}</Pill>
                  </button>
                ))
              )}
            </div>
            {selected ? (
              <Card className="grid gap-3.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3>{selected.title}</h3>
                    <small className="font-semibold text-muted">
                      {selected.audienceLabel} · {formatDate(selected.createdAt)}
                    </small>
                  </div>
                  <Pill tone={kindTone[selected.kind]}>{MESSAGE_KIND_LABEL[selected.kind]}</Pill>
                </div>
                <p className="m-0">{selected.body}</p>
                {selected.audience !== 'reminders' ? (
                  <p className="m-0 text-[13px] text-muted">
                    {selected.sentTo === 0
                      ? 'No parent logins are linked yet.'
                      : `Sent to ${selected.sentTo} ${selected.sentTo === 1 ? 'family' : 'families'}.`}
                  </p>
                ) : null}
              </Card>
            ) : null}
          </div>
        </>
      ) : null}
    </>
  )
}
