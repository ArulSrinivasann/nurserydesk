import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input, Select } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pill } from '@/components/ui/Pill'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { StatCard } from '@/components/ui/StatCard'
import { Table } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { api, ApiError } from '@/lib/api'
import { formatDate } from '@/lib/dates'
import { formatINR, formatINRCompact } from '@/lib/money'
import { zodResolver } from '@/lib/zodResolver'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const schema = z.object({
  name: z.string().trim().min(1, 'Enter a fee name'),
  amountRupees: z.string().min(1, 'Enter an amount'),
  appliesToClassId: z.string(),
  type: z.enum(['Optional', 'Mandatory']),
  dueOn: z.string(),
})

type Values = z.infer<typeof schema>

type FeeTypeRow = {
  id: string
  name: string
  amountPaise: number
  appliesTo: string
  isMandatory: boolean
  dueOn: string | null
  recurring: string
  paidCount: number
  eligibleCount: number
}

type Payload = {
  stats: {
    extraCollected: number
    stillToCollect: number
    childrenStill: number
    typeCount: number
  }
  feeTypes: FeeTypeRow[]
  classes: Array<{ id: string; name: string }>
}

export function OtherFeesPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const query = useQuery({
    queryKey: ['fee-types'],
    queryFn: () => api<Payload>('/api/fee-types'),
  })
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      amountRupees: '',
      appliesToClassId: '',
      type: 'Optional',
      dueOn: '',
    },
  })
  const create = useMutation({
    mutationFn: (values: Values) =>
      api('/api/fee-types', {
        method: 'POST',
        body: JSON.stringify({
          name: values.name,
          amountPaise: Math.round(Number(values.amountRupees) * 100),
          appliesToClassIds: values.appliesToClassId ? [values.appliesToClassId] : [],
          isMandatory: values.type === 'Mandatory',
          dueOn: values.dueOn || null,
        }),
      }),
    onSuccess: () => {
      toast('Fee created')
      setOpen(false)
      form.reset()
      void queryClient.invalidateQueries({ queryKey: ['fee-types'] })
      void queryClient.invalidateQueries({ queryKey: ['invoices'] })
      void queryClient.invalidateQueries({ queryKey: ['students'] })
    },
  })

  if (query.isLoading) {
    return <p className="text-muted">Loading other fees…</p>
  }
  if (query.error || !query.data) {
    return (
      <Card>
        <p className="m-0 text-danger">
          {query.error instanceof ApiError ? query.error.message : 'Could not load other fees.'}
        </p>
      </Card>
    )
  }

  const { stats, feeTypes, classes } = query.data

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
        <StatCard
          label="Extra fees collected"
          value={formatINRCompact(stats.extraCollected)}
          hint="This term"
          trend={stats.extraCollected > 0 ? 'up' : 'neutral'}
        />
        <StatCard
          label="Still to collect"
          value={formatINR(stats.stillToCollect)}
          hint={
            stats.childrenStill === 0
              ? 'All extra fees paid'
              : `From ${stats.childrenStill} ${stats.childrenStill === 1 ? 'child' : 'children'}`
          }
          trend={stats.stillToCollect > 0 ? 'down' : 'up'}
        />
        <StatCard
          label="Fee types"
          value={String(stats.typeCount)}
          hint="Optional and mandatory"
          trend="up"
        />
      </div>
      <div className="mt-[26px]">
        <PageHeader
          title="Other fees"
          action={
            <Button variant={open ? 'alt' : 'primary'} onClick={() => setOpen((value) => !value)}>
              {open ? 'Close' : '+ New fee'}
            </Button>
          }
        />
      </div>
      {open ? (
        <Card className="mb-4">
          <form
            className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5"
            onSubmit={form.handleSubmit((values) => create.mutate(values))}
          >
            <Field id="x-n" label="Fee name" error={form.formState.errors.name?.message}>
              <Input id="x-n" placeholder="Sports day" {...form.register('name')} />
            </Field>
            <Field id="x-a" label="Amount (₹)" error={form.formState.errors.amountRupees?.message}>
              <Input id="x-a" type="number" min={0} placeholder="800" {...form.register('amountRupees')} />
            </Field>
            <Field id="x-c" label="Applies to">
              <Select id="x-c" {...form.register('appliesToClassId')}>
                <option value="">All classes</option>
                {classes.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="x-k" label="Type">
              <Select id="x-k" {...form.register('type')}>
                <option>Optional</option>
                <option>Mandatory</option>
              </Select>
            </Field>
            <Field id="x-d" label="Due date">
              <Input id="x-d" type="date" {...form.register('dueOn')} />
            </Field>
            <div className="col-span-full flex flex-wrap items-center justify-between gap-3">
              <span className="text-muted">Parents see this fee in their app and can pay it online.</span>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? 'Creating…' : 'Create fee'}
              </Button>
            </div>
            {create.error ? (
              <p className="col-span-full m-0 text-danger">
                {create.error instanceof ApiError ? create.error.message : 'Could not create the fee.'}
              </p>
            ) : null}
          </form>
        </Card>
      ) : null}
      {feeTypes.length === 0 ? (
        <Card>
          <p className="m-0 text-muted">
            Create a fee such as sports day, annual day, books or transport so it appears in pending lists.
          </p>
        </Card>
      ) : (
        <Card>
          <Table
            columns={[
              { header: 'Fee', cell: (row) => <b>{row.name}</b> },
              { header: 'Amount', cell: (row) => formatINR(row.amountPaise) },
              { header: 'Applies to', cell: (row) => row.appliesTo },
              {
                header: 'Type',
                cell: (row) =>
                  row.isMandatory ? <Pill tone="warn">Mandatory</Pill> : <Pill tone="info">Optional</Pill>,
              },
              {
                header: 'Due',
                cell: (row) => (row.dueOn ? formatDate(`${row.dueOn}T00:00:00`) : 'Not set'),
              },
              {
                header: 'Collected',
                className: 'min-w-[150px]',
                cell: (row) => (
                  <div>
                    <div className="mb-1 text-xs font-bold text-muted">
                      {row.paidCount} of {row.eligibleCount} paid
                    </div>
                    <ProgressBar
                      value={row.paidCount}
                      max={row.eligibleCount}
                      label={`${row.name} collected`}
                    />
                  </div>
                ),
              },
            ]}
            rows={feeTypes}
            rowKey={(row) => row.id}
          />
        </Card>
      )}
    </>
  )
}
