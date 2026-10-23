import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { Field, Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pill } from '@/components/ui/Pill'
import { ReceiptView, type ReceiptPayload } from '@/features/fees/ReceiptView'
import { useToast } from '@/components/ui/Toast'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { PAYMENT_METHODS, type PaymentMethod } from '@/lib/fees'
import { formatINR } from '@/lib/money'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

type FinderStudent = {
  id: string
  firstName: string
  lastName: string | null
  className: string
  rollNo: number | null
  admissionNo: string
  duePaise: number
}

type PendingItem = {
  id: string
  feeTypeId: string | null
  description: string
  amountPaise: number
  mandatory: boolean
  dueLabel: string
}

type PendingPayload = {
  student: {
    id: string
    firstName: string
    lastName: string | null
    className: string
    rollNo: number | null
    admissionNo: string
    parentName: string
    yearLabel: string
  }
  items: PendingItem[]
}

function childName(row: { firstName: string; lastName: string | null }) {
  return `${row.firstName} ${row.lastName ?? ''}`.trim()
}

export function CollectPaymentPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const studentId = params.get('studentId')
  const paymentId = params.get('paymentId')
  const [classId, setClassId] = useState('all')
  const [queryText, setQueryText] = useState('')
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [method, setMethod] = useState<PaymentMethod>('Cash')
  const [reference, setReference] = useState('')

  const finder = useQuery({
    queryKey: ['pay-students', classId, queryText],
    enabled: !paymentId,
    queryFn: () => {
      const search = new URLSearchParams()
      if (classId !== 'all') search.set('classId', classId)
      if (queryText.trim()) search.set('q', queryText.trim())
      const suffix = search.toString()
      return api<{ classes: Array<{ id: string; name: string }>; students: FinderStudent[] }>(
        `/api/payments/students${suffix ? `?${suffix}` : ''}`,
      )
    },
  })

  const pending = useQuery({
    queryKey: ['pay-pending', studentId],
    enabled: Boolean(studentId) && !paymentId,
    queryFn: () => api<PendingPayload>(`/api/payments/pending?studentId=${studentId}`),
  })

  const receipt = useQuery({
    queryKey: ['receipt', paymentId],
    enabled: Boolean(paymentId),
    queryFn: () => api<ReceiptPayload>(`/api/payments/${paymentId}`),
  })

  useEffect(() => {
    const items = pending.data?.items ?? []
    setSelected(items[0] ? { [items[0].id]: true } : {})
  }, [pending.data])

  const totalPaise = useMemo(() => {
    return (pending.data?.items ?? [])
      .filter((item) => selected[item.id])
      .reduce((sum, item) => sum + item.amountPaise, 0)
  }, [pending.data, selected])

  const record = useMutation({
    mutationFn: () =>
      api<{ paymentId: string; receiptNo: string }>('/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          studentId,
          method,
          reference: method === 'Cheque' ? reference : undefined,
          itemIds: Object.keys(selected).filter((id) => selected[id]),
        }),
      }),
    onSuccess: (data) => {
      toast(`Payment recorded`)
      void queryClient.invalidateQueries({ queryKey: ['invoices'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['students'] })
      void queryClient.invalidateQueries({ queryKey: ['fee-types'] })
      void queryClient.invalidateQueries({ queryKey: ['pay-students'] })
      setParams({ paymentId: data.paymentId })
    },
  })

  if (paymentId) {
    if (receipt.isLoading) {
      return <p className="text-muted">Loading receipt…</p>
    }
    if (receipt.error || !receipt.data) {
      return (
        <Card>
          <p className="m-0 text-danger">
            {receipt.error instanceof ApiError ? receipt.error.message : 'Could not load the receipt.'}
          </p>
        </Card>
      )
    }
    return (
      <ReceiptView
        data={receipt.data}
        successTitle="Payment recorded"
        anotherLabel="Collect another"
        showSendToParent
        onSendToParent={() => toast('Receipt sent to parent')}
        onPdf={() => {
          window.print()
          toast('Receipt saved as PDF')
        }}
        onAnother={() => {
          if (studentId) setParams({ studentId })
          else setParams({})
        }}
      />
    )
  }

  if (finder.isLoading) {
    return <p className="text-muted">Loading students…</p>
  }
  if (finder.error || !finder.data) {
    return (
      <Card>
        <p className="m-0 text-danger">
          {finder.error instanceof ApiError ? finder.error.message : 'Could not load students.'}
        </p>
      </Card>
    )
  }

  const classes = finder.data.classes
  const students = finder.data.students

  return (
    <>
      <PageHeader title="Collect payment" subtitle="Pick a child, tick the fees being paid and record how they paid." />
      <Card className="mb-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3>Find student</h3>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by class">
            <Chip active={classId === 'all'} onClick={() => setClassId('all')}>
              All
            </Chip>
            {classes.map((row) => (
              <Chip key={row.id} active={classId === row.id} onClick={() => setClassId(row.id)}>
                {row.name}
              </Chip>
            ))}
          </div>
        </div>
        <Field id="fq" label="Search by name, roll number or admission number">
          <Input
            id="fq"
            value={queryText}
            onChange={(event) => setQueryText(event.target.value)}
            placeholder="Try Zoya, 2 or LS-26-043"
            autoComplete="off"
          />
        </Field>
        <div className="mt-3">
          {students.length === 0 ? (
            <p className="m-0 text-muted">
              No student matches. Check the spelling, or try a roll number or a different class.
            </p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-2.5">
              {students.map((row, index) => (
                <button
                  key={row.id}
                  type="button"
                  className={cn(
                    'flex items-center gap-2.5 rounded-2xl border-2 p-3 text-left',
                    studentId === row.id ? 'border-primary bg-primary-tint' : 'border-line bg-surface',
                  )}
                  onClick={() => setParams({ studentId: row.id })}
                >
                  <Avatar name={row.firstName} index={index} />
                  <div className="min-w-0 flex-1">
                    <b className="block">{childName(row)}</b>
                    <small className="block font-semibold text-muted">
                      {row.className} · Roll {String(row.rollNo ?? 0).padStart(2, '0')} · {row.admissionNo}
                    </small>
                  </div>
                  {row.duePaise > 0 ? (
                    <Pill tone="warn">{formatINR(row.duePaise)} due</Pill>
                  ) : (
                    <Pill tone="success">Paid up</Pill>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {studentId ? (
        pending.isLoading ? (
          <p className="text-muted">Loading pending fees…</p>
        ) : pending.error || !pending.data ? (
          <Card>
            <p className="m-0 text-danger">
              {pending.error instanceof ApiError ? pending.error.message : 'Could not load pending fees.'}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <h3>Pending fees for {childName(pending.data.student)}</h3>
              {pending.data.items.length === 0 ? (
                <p className="mb-0 mt-3 text-muted">This child is paid up. Pick another child, or generate invoices first.</p>
              ) : (
                <div className="mt-3 grid gap-2">
                  {pending.data.items.map((item) => (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-center gap-3 rounded-[14px] border border-line bg-bg px-3 py-2.5"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(selected[item.id])}
                        onChange={() => setSelected((current) => ({ ...current, [item.id]: !current[item.id] }))}
                      />
                      <div className="flex-1">
                        <b>{item.description}</b>
                        <div>
                          <Pill tone={item.mandatory ? 'warn' : 'info'}>{item.dueLabel}</Pill>
                        </div>
                      </div>
                      <b>{formatINR(item.amountPaise)}</b>
                    </label>
                  ))}
                </div>
              )}
            </Card>
            <Card className="self-start">
              <h3>How did they pay?</h3>
              <div className="my-3 grid grid-cols-2 gap-2.5">
                {PAYMENT_METHODS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={cn(
                      'rounded-2xl border-2 p-3 text-left font-bold',
                      method === option ? 'border-primary bg-primary-tint' : 'border-line bg-surface',
                    )}
                    onClick={() => setMethod(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {method === 'Cheque' ? (
                <Field id="chq" label="Cheque number" className="mb-3">
                  <Input id="chq" placeholder="000123" value={reference} onChange={(event) => setReference(event.target.value)} />
                </Field>
              ) : null}
              <div className="mb-3 flex items-center justify-between border-t border-line pt-3">
                <span>Total to pay</span>
                <b className="font-heading text-2xl font-semibold">{formatINR(totalPaise)}</b>
              </div>
              <Button
                className="w-full"
                disabled={totalPaise <= 0 || record.isPending}
                onClick={() => record.mutate()}
              >
                {record.isPending ? 'Recording…' : `Record ${formatINR(totalPaise)} payment`}
              </Button>
              {record.error ? (
                <p className="mb-0 mt-2 text-danger">
                  {record.error instanceof ApiError ? record.error.message : 'Could not record the payment.'}
                </p>
              ) : null}
            </Card>
          </div>
        )
      ) : null}
    </>
  )
}
