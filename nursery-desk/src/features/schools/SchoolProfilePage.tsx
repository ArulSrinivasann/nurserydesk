import { api, ApiError } from '@/lib/api'
import { formatINR } from '@/lib/money'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pill } from '@/components/ui/Pill'
import { useToast } from '@/components/ui/Toast'
import { zodResolver } from '@/lib/zodResolver'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const schema = z.object({
  name: z.string().trim().min(1, 'Enter the school name'),
  address: z.string(),
  phone: z.string(),
  email: z.string(),
  logoUrl: z.string(),
  admissionFeeRupees: z.string().min(1, 'Enter the admission fee'),
  admissionPrefix: z.string(),
})

type Values = z.infer<typeof schema>

type SchoolPayload = {
  school: {
    name: string
    address: string | null
    phone: string | null
    email: string | null
    logoUrl: string | null
    admissionFeePaise: number
    admissionPrefix: string | null
    status: string
  }
  plan: { name: string; childLimit: number | null } | null
  years: Array<{
    id: string
    label: string
    startsOn: string
    endsOn: string
    isCurrent: boolean
  }>
}

const yearSchema = z.object({
  label: z.string().trim().min(1, 'Enter a label'),
  startsOn: z.string().min(1, 'Pick a start date'),
  endsOn: z.string().min(1, 'Pick an end date'),
})

type YearValues = z.infer<typeof yearSchema>

export function SchoolProfilePage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['school'],
    queryFn: () => api<SchoolPayload>('/api/school'),
  })

  if (query.isLoading) {
    return <p className="text-muted">Loading school profile…</p>
  }
  if (query.error || !query.data) {
    return (
      <Card>
        <p className="m-0 text-danger">
          {query.error instanceof ApiError ? query.error.message : 'Could not load the school.'} Check
          Neon is configured, then try again.
        </p>
      </Card>
    )
  }

  return (
    <>
      <PageHeader
        title="School"
        subtitle={`${query.data.school.name} · ${query.data.plan?.name ?? 'No plan'}`}
      />
      <SchoolForm data={query.data} onSaved={() => void queryClient.invalidateQueries({ queryKey: ['school'] })} />
      <div className="h-6" />
      <YearsPanel
        years={query.data.years}
        onChanged={() => {
          toast('Academic year saved')
          void queryClient.invalidateQueries({ queryKey: ['school'] })
        }}
      />
    </>
  )
}

function SchoolForm({ data, onSaved }: { data: SchoolPayload; onSaved: () => void }) {
  const { toast } = useToast()
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: data.school.name,
      address: data.school.address ?? '',
      phone: data.school.phone ?? '',
      email: data.school.email ?? '',
      logoUrl: data.school.logoUrl ?? '',
      admissionFeeRupees: String(data.school.admissionFeePaise / 100),
      admissionPrefix: data.school.admissionPrefix ?? '',
    },
  })
  const save = useMutation({
    mutationFn: (values: Values) =>
      api('/api/school', {
        method: 'PATCH',
        body: JSON.stringify({
          name: values.name,
          address: values.address,
          phone: values.phone,
          email: values.email,
          logoUrl: values.logoUrl,
          admissionFeePaise: Math.round(Number(values.admissionFeeRupees) * 100),
          admissionPrefix: values.admissionPrefix,
        }),
      }),
    onSuccess: () => {
      toast('School saved')
      onSaved()
    },
  })

  return (
    <Card>
      <div className="mb-4 flex flex-wrap gap-2">
        <Pill tone={data.school.status === 'active' ? 'success' : data.school.status === 'trial' ? 'warn' : 'danger'}>
          {data.school.status}
        </Pill>
        <Pill tone="info">{data.plan?.name ?? 'No plan'}</Pill>
        <span className="text-[13px] font-semibold text-muted">
          Admission fee {formatINR(data.school.admissionFeePaise)}
        </span>
      </div>
      <form
        autoComplete="off"
        className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5"
        onSubmit={form.handleSubmit((values) => save.mutate(values))}
      >
        <Field id="name" label="School name" error={form.formState.errors.name?.message}>
          <Input id="name" autoComplete="organization" {...form.register('name')} />
        </Field>
        <Field id="phone" label="Phone">
          <Input id="phone" {...form.register('phone')} />
        </Field>
        <Field id="email" label="Email">
          <Input id="email" type="email" {...form.register('email')} />
        </Field>
        <Field id="logoUrl" label="Logo URL">
          <Input id="logoUrl" {...form.register('logoUrl')} />
        </Field>
        <Field id="address" label="Address" className="col-span-full">
          <Input id="address" {...form.register('address')} />
        </Field>
        <Field
          id="admissionFeeRupees"
          label="One-time admission fee (₹)"
          error={form.formState.errors.admissionFeeRupees?.message}
        >
          <Input id="admissionFeeRupees" type="number" min="0" {...form.register('admissionFeeRupees')} />
        </Field>
        <Field id="admissionPrefix" label="Admission number prefix">
          <Input id="admissionPrefix" placeholder="LS" autoComplete="off" {...form.register('admissionPrefix')} />
        </Field>
        <div className="col-span-full">
          <Button type="submit" disabled={save.isPending}>
            Save school
          </Button>
          {save.error instanceof ApiError ? (
            <p className="mt-2 text-[13px] text-danger">{save.error.message}</p>
          ) : null}
        </div>
      </form>
    </Card>
  )
}

function YearsPanel({
  years,
  onChanged,
}: {
  years: SchoolPayload['years']
  onChanged: () => void
}) {
  const form = useForm<YearValues>({
    resolver: zodResolver(yearSchema),
    defaultValues: { label: '', startsOn: '', endsOn: '' },
  })
  const create = useMutation({
    mutationFn: (values: YearValues) =>
      api('/api/academic-years', {
        method: 'POST',
        body: JSON.stringify({ ...values, isCurrent: years.length === 0 }),
      }),
    onSuccess: () => {
      form.reset()
      onChanged()
    },
  })
  const setCurrent = useMutation({
    mutationFn: (id: string) => api(`/api/academic-years/${id}/current`, { method: 'POST' }),
    onSuccess: onChanged,
  })

  return (
    <>
      <PageHeader title="Academic years" subtitle="Only one year can be current" />
      {years.length === 0 ? (
        <Card className="mb-4">
          <p className="m-0 text-muted">Add the first academic year so you can create classes.</p>
        </Card>
      ) : (
        <div className="mb-4 grid gap-2">
          {years.map((year) => (
            <Card key={year.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <b>{year.label}</b>
                <div className="text-[13px] text-muted">
                  {year.startsOn.slice(0, 10)} to {year.endsOn.slice(0, 10)}
                </div>
              </div>
              {year.isCurrent ? (
                <Pill tone="success">Current</Pill>
              ) : (
                <Button variant="alt" onClick={() => setCurrent.mutate(year.id)}>
                  Make current
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
      <Card>
        <form
          className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5"
          onSubmit={form.handleSubmit((values) => create.mutate(values))}
        >
          <Field id="label" label="Label" error={form.formState.errors.label?.message}>
            <Input id="label" placeholder="2026–27" {...form.register('label')} />
          </Field>
          <Field id="startsOn" label="Starts" error={form.formState.errors.startsOn?.message}>
            <Input id="startsOn" type="date" {...form.register('startsOn')} />
          </Field>
          <Field id="endsOn" label="Ends" error={form.formState.errors.endsOn?.message}>
            <Input id="endsOn" type="date" {...form.register('endsOn')} />
          </Field>
          <div className="flex items-end">
            <Button type="submit" disabled={create.isPending}>
              Add year
            </Button>
          </div>
        </form>
      </Card>
    </>
  )
}
