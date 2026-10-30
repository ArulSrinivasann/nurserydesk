import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input, Select } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pill } from '@/components/ui/Pill'
import { Table } from '@/components/ui/Table'
import { api, ApiError } from '@/lib/api'
import type { StaffRole } from '@/lib/staff'
import { zodResolver } from '@/lib/zodResolver'
import { ROLE_LABEL } from '@/types/roles'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const schema = z.object({
  fullName: z.string().trim().min(1, 'Enter the staff member’s name'),
  email: z.string().trim().email('Enter a login email'),
  phone: z.string(),
  role: z.enum(['teacher', 'school_admin']),
})

type Values = z.infer<typeof schema>

type StaffRow = {
  id: string
  fullName: string
  email: string
  phone: string | null
  role: StaffRole
  classNames: string[]
}

type CreatedStaff = {
  staff: StaffRow
  password: string
}

function rolePill(role: StaffRole) {
  return <Pill tone={role === 'school_admin' ? 'info' : 'success'}>{ROLE_LABEL[role]}</Pill>
}

export function StaffCreationPage() {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['staff'],
    queryFn: () => api<{ staff: StaffRow[] }>('/api/staff'),
  })
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', email: '', phone: '', role: 'teacher' },
  })
  const create = useMutation({
    mutationFn: (values: Values) =>
      api<CreatedStaff>('/api/staff', { method: 'POST', body: JSON.stringify(values) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['staff'] })
      void queryClient.invalidateQueries({ queryKey: ['users'] })
      void queryClient.invalidateQueries({ queryKey: ['classes'] })
      form.reset({ fullName: '', email: '', phone: '', role: 'teacher' })
    },
  })

  if (query.isLoading) {
    return <p className="text-muted">Loading staff…</p>
  }
  if (query.error || !query.data) {
    return (
      <Card>
        <p className="m-0 text-danger">
          {query.error instanceof ApiError ? query.error.message : 'Could not load staff.'}
        </p>
      </Card>
    )
  }

  const created = create.data

  return (
    <>
      <PageHeader
        title="Staff creation"
        subtitle="Add a teacher or another school admin. They can sign in with the one-time password."
      />
      {created ? (
        <Card className="mb-4 grid gap-3">
          <div>
            <h3 className="mt-0">{created.staff.fullName} is ready</h3>
            <p className="m-0 text-muted">
              Share this login once. The password will not be shown again.
            </p>
          </div>
          <dl className="m-0 grid grid-cols-[120px_1fr] gap-x-3 gap-y-1.5">
            <dt className="font-bold text-muted">Role</dt>
            <dd className="m-0 font-bold">{ROLE_LABEL[created.staff.role]}</dd>
            <dt className="font-bold text-muted">Email</dt>
            <dd className="m-0 font-bold">{created.staff.email}</dd>
            <dt className="font-bold text-muted">Password</dt>
            <dd className="m-0 font-bold">{created.password}</dd>
          </dl>
          <div>
            <Button variant="alt" onClick={() => create.reset()}>
              Create another
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="mb-4">
          <h3 className="mt-0">New staff member</h3>
          <form
            className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5"
            onSubmit={form.handleSubmit((values) => create.mutate(values))}
          >
            <Field id="staff-name" label="Full name" error={form.formState.errors.fullName?.message}>
              <Input id="staff-name" autoComplete="name" {...form.register('fullName')} />
            </Field>
            <Field id="staff-email" label="Login email" error={form.formState.errors.email?.message}>
              <Input id="staff-email" type="email" autoComplete="off" {...form.register('email')} />
            </Field>
            <Field id="staff-phone" label="Phone">
              <Input id="staff-phone" {...form.register('phone')} />
            </Field>
            <Field id="staff-role" label="Role">
              <Select id="staff-role" {...form.register('role')}>
                <option value="teacher">Teacher</option>
                <option value="school_admin">School admin</option>
              </Select>
            </Field>
            <div className="flex items-end">
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? 'Creating…' : 'Create staff'}
              </Button>
            </div>
            {create.error instanceof ApiError ? (
              <p className="col-span-full m-0 text-[13px] text-danger">{create.error.message}</p>
            ) : null}
          </form>
        </Card>
      )}
      <Card>
        <h3 className="mt-0">Staff at this school</h3>
        <Table
          rows={query.data.staff}
          rowKey={(row) => row.id}
          empty="Create a teacher so they can take attendance and receive a class."
          columns={[
            { header: 'Name', cell: (row) => <b>{row.fullName}</b> },
            { header: 'Role', cell: (row) => rolePill(row.role) },
            { header: 'Email', cell: (row) => row.email },
            { header: 'Phone', cell: (row) => row.phone || '—' },
            {
              header: 'Classes',
              cell: (row) => (row.classNames.length ? row.classNames.join(', ') : '—'),
            },
          ]}
        />
      </Card>
    </>
  )
}
