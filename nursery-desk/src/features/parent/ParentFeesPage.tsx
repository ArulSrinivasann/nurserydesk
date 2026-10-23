import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pill } from '@/components/ui/Pill'
import { ReceiptView, type ReceiptPayload } from '@/features/fees/ReceiptView'
import { useToast } from '@/components/ui/Toast'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import { PARENT_PAYMENT_METHODS, type ParentPaymentMethod } from '@/lib/fees'
import { formatINR } from '@/lib/money'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

type PendingItem = {
  id: string
  description: string
  amountPaise: number
  mandatory: boolean
  dueLabel: string
}

type Payload = {
  children: Array<{ id: string; firstName: string; lastName: string | null }>
  student: {
    id: string
    firstName: string
    lastName: string | null
    className: string
    rollNo: number | null
    admissionNo: string
    parentName: string
    yearLabel: string
  } | null
  items: PendingItem[]
}

function childName(row: { firstName: string; lastName: string | null }) {
  return `${row.firstName} ${row.lastName ?? ''}`.trim()
}

export function ParentFeesPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const studentId = params.get('studentId')
  const paymentId = params.get('paymentId')
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [method, setMethod] = useState<ParentPaymentMethod>('UPI')

  const query = useQuery({
    queryKey: ['parent-fees', studentId],
    enabled: !paymentId,
    queryFn: () => api<Payload>(`/api/parent/fees${studentId ? `?studentId=${studentId}` : ''}`),
  })
  const receipt = useQuery({
    queryKey: ['parent-receipt', paymentId],
    enabled: Boolean(paymentId),
    queryFn: () => api<ReceiptPayload>(`/api/parent/payments/${paymentId}`),
  })

  useEffect(() => {
    const items = query.data?.items ?? []
    setSelected(items[0] ? { [items[0].id]: true } : {})
  }, [query.data])

  const totalPaise = useMemo(() => {
    return (query.data?.items ?? [])
      .filter((item) => selected[item.id])
      .reduce((sum, item) => sum + item.amountPaise, 0)
  }, [query.data, selected])

  const pay = useMutation({
    mutationFn: () =>
      api<{ paymentId: string; receiptNo: string }>('/api/parent/payments', {
        method: 'POST',
        body: JSON.stringify({
          studentId: query.data?.student?.id,
          method,
          itemIds: Object.keys(selected).filter((id) => selected[id]),
        }),
      }),
    onSuccess: (data) => {
      toast('Payment successful')
      void queryClient.invalidateQueries({ queryKey: ['parent-home'] })
      void queryClient.invalidateQueries({ queryKey: ['parent-fees'] })
      setParams({ paymentId: data.paymentId })
    },
  })

  if (paymentId) {
    if (receipt.isLoading) return <p className="text-muted">Loading receipt…</p>
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
        successTitle="Payment successful"
        anotherLabel="Pay another fee"
        onPdf={() => {
          window.print()
          toast('Receipt saved as PDF')
        }}
        onAnother={() => setParams(studentId ? { studentId } : {})}
      />
    )
  }

  if (query.isLoading) {
    return <p className="text-muted">Loading fees…</p>
  }
  if (query.error || !query.data) {
    return (
      <Card>
        <p className="m-0 text-danger">
          {query.error instanceof ApiError ? query.error.message : 'Could not load fees.'}
        </p>
      </Card>
    )
  }

  if (!query.data.student) {
    return (
      <Card>
        <p className="m-0 text-muted">Ask the school office to link your login to your child.</p>
      </Card>
    )
  }

  const student = query.data.student

  return (
    <>
      <PageHeader title="Pay fees" subtitle={`Tick what you want to pay for ${childName(student)}.`} />
      {query.data.children.length > 1 ? (
        <div className="mb-3.5 flex flex-wrap gap-1.5" role="group" aria-label="Your children">
          {query.data.children.map((row) => (
            <Chip
              key={row.id}
              active={row.id === student.id}
              onClick={() => setParams({ studentId: row.id })}
            >
              {childName(row)}
            </Chip>
          ))}
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h3>Pending fees</h3>
          {query.data.items.length === 0 ? (
            <p className="mb-0 mt-3 text-muted">You’re paid up. Receipts stay in the school office if you need a copy.</p>
          ) : (
            <div className="mt-3 grid gap-2">
              {query.data.items.map((item) => (
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
          <h3>Pay with</h3>
          <div className="my-3 grid grid-cols-3 gap-2.5">
            {PARENT_PAYMENT_METHODS.map((option) => (
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
          <div className="mb-3 flex items-center justify-between border-t border-line pt-3">
            <span>Total to pay</span>
            <b className="font-heading text-2xl font-semibold">{formatINR(totalPaise)}</b>
          </div>
          <Button className="w-full" disabled={totalPaise <= 0 || pay.isPending} onClick={() => pay.mutate()}>
            {pay.isPending ? 'Paying…' : `Pay ${formatINR(totalPaise)}`}
          </Button>
          {pay.error ? (
            <p className="mb-0 mt-2 text-danger">
              {pay.error instanceof ApiError ? pay.error.message : 'Could not complete the payment.'}
            </p>
          ) : null}
        </Card>
      </div>
    </>
  )
}
