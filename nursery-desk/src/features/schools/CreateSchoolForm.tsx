import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input, Select } from '@/components/ui/Input'
import { api, ApiError } from '@/lib/api'
import { formatDate } from '@/lib/dates'
import { isoDate, trialEndDate } from '@/lib/platform'
import { zodResolver } from '@/lib/zodResolver'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const schema = z
  .object({
    name: z.string().trim().min(1, 'Enter the school name'),
    phone: z.string(),
    email: z.string(),
    adminName: z.string().trim().min(1, 'Enter the school admin’s name'),
    adminEmail: z.string().trim().email('Enter a login email'),
    adminPhone: z.string(),
    planId: z.string().min(1, 'Pick a plan'),
    status: z.enum(['trial', 'active']),
    trialEndsAt: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.status === 'trial' && !values.trialEndsAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['trialEndsAt'],
        message: 'Pick a trial end date',
      })
    }
  })

type Values = z.infer<typeof schema>

export type CreatedSchool = {
  school: {
    id: string
    name: string
    status: string
    trialEndsAt: string | null
    planName: string
  }
  admin: { fullName: string; email: string; password: string }
}

type PlanRow = {
  id: string
  name: string
}

export type SchoolFormDefaults = {
  demoRequestId?: string
  name?: string
  phone?: string
  email?: string
  adminName?: string
  adminEmail?: string
  adminPhone?: string
}

type Props = {
  defaults?: SchoolFormDefaults
  onCreated?: () => void
  onDone?: () => void
}

export function CreateSchoolForm({ defaults, onCreated, onDone }: Props) {
  const plansQuery = useQuery({
    queryKey: ['plans'],
    queryFn: () => api<{ plans: PlanRow[] }>('/api/plans'),
  })
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaults?.name ?? '',
      phone: defaults?.phone ?? '',
      email: defaults?.email ?? '',
      adminName: defaults?.adminName ?? '',
      adminEmail: defaults?.adminEmail ?? '',
      adminPhone: defaults?.adminPhone ?? '',
      planId: '',
      status: 'trial',
      trialEndsAt: isoDate(trialEndDate()),
    },
  })
  const status = form.watch('status')
  const create = useMutation({
    mutationFn: (values: Values) =>
      api<CreatedSchool>('/api/schools', {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          demoRequestId: defaults?.demoRequestId,
          trialEndsAt: values.status === 'trial' ? values.trialEndsAt : undefined,
        }),
      }),
    onSuccess: () => onCreated?.(),
  })

  if (create.data) {
    const { school, admin } = create.data
    return (
      <Card className="grid gap-3">
        <div>
          <h3 className="mt-0">{school.name} is ready</h3>
          <p className="m-0 text-muted">
            Share this login with the school admin. The password will not be shown again.
          </p>
        </div>
        <dl className="m-0 grid grid-cols-[140px_1fr] gap-x-3 gap-y-1.5">
          <dt className="font-bold text-muted">Plan</dt>
          <dd className="m-0 font-bold">
            {school.planName}
            {school.status === 'trial' && school.trialEndsAt
              ? ` · trial until ${formatDate(school.trialEndsAt)}`
              : ' · paid'}
          </dd>
          <dt className="font-bold text-muted">Admin</dt>
          <dd className="m-0 font-bold">{admin.fullName}</dd>
          <dt className="font-bold text-muted">Email</dt>
          <dd className="m-0 font-bold">{admin.email}</dd>
          <dt className="font-bold text-muted">Password</dt>
          <dd className="m-0 font-bold">{admin.password}</dd>
        </dl>
        {onDone ? <Button onClick={onDone}>Done</Button> : null}
      </Card>
    )
  }

  return (
    <Card>
      <h3 className="mt-0">Create school user</h3>
      <p className="mt-0 mb-4 text-muted">
        Pick a plan and whether this school starts on a 14-day trial or a paid plan.
      </p>
      <form
        className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5"
        onSubmit={form.handleSubmit((values) => create.mutate(values))}
      >
        <Field id="school-name" label="School name" error={form.formState.errors.name?.message}>
          <Input id="school-name" autoComplete="organization" {...form.register('name')} />
        </Field>
        <Field id="school-phone" label="School phone">
          <Input id="school-phone" {...form.register('phone')} />
        </Field>
        <Field id="school-email" label="School email">
          <Input id="school-email" type="email" {...form.register('email')} />
        </Field>
        <Field id="admin-name" label="School admin" error={form.formState.errors.adminName?.message}>
          <Input id="admin-name" autoComplete="name" {...form.register('adminName')} />
        </Field>
        <Field id="admin-email" label="Login email" error={form.formState.errors.adminEmail?.message}>
          <Input id="admin-email" type="email" autoComplete="off" {...form.register('adminEmail')} />
        </Field>
        <Field id="admin-phone" label="Admin phone">
          <Input id="admin-phone" {...form.register('adminPhone')} />
        </Field>
        <Field id="plan-id" label="Plan" error={form.formState.errors.planId?.message}>
          <Select id="plan-id" {...form.register('planId')}>
            <option value="">Pick a plan</option>
            {(plansQuery.data?.plans ?? []).map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="school-status" label="Access">
          <Select id="school-status" {...form.register('status')}>
            <option value="trial">14-day trial</option>
            <option value="active">Paid plan</option>
          </Select>
        </Field>
        {status === 'trial' ? (
          <Field
            id="trial-ends"
            label="Trial ends"
            error={form.formState.errors.trialEndsAt?.message}
          >
            <Input id="trial-ends" type="date" {...form.register('trialEndsAt')} />
          </Field>
        ) : null}
        <div className="col-span-full">
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Creating…' : 'Create school user'}
          </Button>
          {create.error instanceof ApiError ? (
            <p className="mt-2 mb-0 text-[13px] text-danger">{create.error.message}</p>
          ) : null}
        </div>
      </form>
    </Card>
  )
}
