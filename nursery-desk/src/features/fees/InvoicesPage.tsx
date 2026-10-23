import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pill } from '@/components/ui/Pill'
import { StatCard } from '@/components/ui/StatCard'
import { Table } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { api, ApiError } from '@/lib/api'
import { formatINR, formatINRCompact } from '@/lib/money'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

type InvoiceRow = {
  id: string
  number: string
  studentId: string
  firstName: string
  lastName: string | null
  amountPaise: number
  remainingPaise: number
  status: string
  issuedOn: string
  dueOn: string
  paymentId: string | null
}

type Payload = {
  monthLabel: string
  stats: {
    billed: number
    collected: number
    outstanding: number
    overdue: number
    collectedPct: number
  }
  invoices: InvoiceRow[]
}

function statusPill(status: string) {
  if (status === 'paid') return <Pill tone="success">Paid</Pill>
  if (status === 'overdue') return <Pill tone="danger">Overdue</Pill>
  return <Pill tone="warn">Due</Pill>
}

function childName(row: { firstName: string; lastName: string | null }) {
  return `${row.firstName} ${row.lastName ?? ''}`.trim()
}

export function InvoicesPage() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api<Payload>('/api/invoices'),
  })
  const generate = useMutation({
    mutationFn: () => api<{ created: number; monthLabel: string }>('/api/invoices/generate', { method: 'POST' }),
    onSuccess: (data) => {
      toast(
        data.created === 0
          ? `No new invoices — everyone already has ${data.monthLabel} billed.`
          : `${data.created} ${data.monthLabel} invoice${data.created === 1 ? '' : 's'} created`,
      )
      void queryClient.invalidateQueries({ queryKey: ['invoices'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['students'] })
    },
  })

  if (query.isLoading) {
    return <p className="text-muted">Loading invoices…</p>
  }
  if (query.error || !query.data) {
    return (
      <Card>
        <p className="m-0 text-danger">
          {query.error instanceof ApiError ? query.error.message : 'Could not load invoices.'}
        </p>
      </Card>
    )
  }

  const { monthLabel, stats, invoices } = query.data

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
        <StatCard
          label="Billed"
          value={formatINRCompact(stats.billed)}
          hint={monthLabel}
          trend="up"
        />
        <StatCard
          label="Collected"
          value={formatINRCompact(stats.collected)}
          hint={`${stats.collectedPct}%`}
          trend={stats.collected > 0 ? 'up' : 'neutral'}
        />
        <StatCard
          label="Outstanding"
          value={formatINRCompact(stats.outstanding)}
          hint={`${stats.overdue} overdue`}
          trend={stats.outstanding > 0 ? 'down' : 'up'}
        />
      </div>
      <div className="mt-[26px]">
        <PageHeader
          title="Invoices"
          action={
            <Button disabled={generate.isPending} onClick={() => generate.mutate()}>
              {generate.isPending ? 'Generating…' : `Generate ${monthLabel} invoices`}
            </Button>
          }
        />
      </div>
      {generate.error ? (
        <p className="text-danger">
          {generate.error instanceof ApiError ? generate.error.message : 'Could not generate invoices.'}
        </p>
      ) : null}
      {invoices.length === 0 ? (
        <Card>
          <p className="m-0 text-muted">
            Generate this month’s invoices to bill monthly fees. First invoices are created when you enrol a child.
          </p>
        </Card>
      ) : (
        <Card>
          <Table
            columns={[
              {
                header: 'Child',
                cell: (row) => (
                  <div className="flex items-center gap-2.5 font-bold">
                    <Avatar name={row.firstName} index={invoices.findIndex((item) => item.id === row.id)} />
                    {childName(row)}
                  </div>
                ),
              },
              { header: 'Invoice', cell: (row) => row.number },
              { header: 'Amount', cell: (row) => formatINR(row.amountPaise) },
              { header: 'Status', cell: (row) => statusPill(row.status) },
              {
                header: '',
                cell: (row) =>
                  row.status === 'paid' && row.paymentId ? (
                    <Button variant="alt" onClick={() => void navigate(`/admin/fees/collect?paymentId=${row.paymentId}`)}>
                      Receipt
                    </Button>
                  ) : (
                    <Button onClick={() => void navigate(`/admin/fees/collect?studentId=${row.studentId}`)}>
                      Record payment
                    </Button>
                  ),
              },
            ]}
            rows={invoices}
            rowKey={(row) => row.id}
          />
        </Card>
      )}
    </>
  )
}
