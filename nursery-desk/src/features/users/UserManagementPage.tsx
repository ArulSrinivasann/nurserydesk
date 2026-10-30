import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { Field, Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pill } from '@/components/ui/Pill'
import { Table } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { api, ApiError } from '@/lib/api'
import type { SchoolUserRole } from '@/lib/staff'
import { zodResolver } from '@/lib/zodResolver'
import { ROLE_LABEL } from '@/types/roles'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const schema = z.object({
  fullName: z.string().trim().min(1, 'Enter the person’s name'),
  phone: z.string(),
})

type Values = z.infer<typeof schema>

type SchoolUser = {
  id: string
  fullName: string
  email: string
  phone: string | null
  role: SchoolUserRole
  classNames: string[]
}

type Filter = 'all' | SchoolUserRole

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'school_admin', label: 'Admins' },
  { id: 'teacher', label: 'Teachers' },
  { id: 'parent', label: 'Parents' },
]

function rolePill(role: SchoolUserRole) {
  if (role === 'school_admin') return <Pill tone="info">{ROLE_LABEL[role]}</Pill>
  if (role === 'teacher') return <Pill tone="success">{ROLE_LABEL[role]}</Pill>
  return <Pill>{ROLE_LABEL[role]}</Pill>
}

export function UserManagementPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<Filter>('all')
  const [editing, setEditing] = useState<SchoolUser | null>(null)
  const [issued, setIssued] = useState<{ name: string; email: string; password: string } | null>(null)
  const query = useQuery({
    queryKey: ['users'],
    queryFn: () => api<{ users: SchoolUser[] }>('/api/users'),
  })
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: {
      fullName: editing?.fullName ?? '',
      phone: editing?.phone ?? '',
    },
  })

  const save = useMutation({
    mutationFn: (values: Values) => {
      if (!editing) throw new Error('Pick a person to edit.')
      return api(`/api/users/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify(values),
      })
    },
    onSuccess: () => {
      toast('User saved')
      setEditing(null)
      void queryClient.invalidateQueries({ queryKey: ['users'] })
      void queryClient.invalidateQueries({ queryKey: ['staff'] })
    },
  })

  const resetPassword = useMutation({
    mutationFn: (user: SchoolUser) =>
      api<{ user: { fullName: string; email: string }; password: string }>(
        `/api/users/${user.id}/reset-password`,
        { method: 'POST' },
      ),
    onSuccess: (data) => {
      setIssued({ name: data.user.fullName, email: data.user.email, password: data.password })
      toast('New password created')
    },
  })

  const users = query.data?.users ?? []
  const visible = useMemo(
    () => (filter === 'all' ? users : users.filter((row) => row.role === filter)),
    [filter, users],
  )

  if (query.isLoading) {
    return <p className="text-muted">Loading users…</p>
  }
  if (query.error || !query.data) {
    return (
      <Card>
        <p className="m-0 text-danger">
          {query.error instanceof ApiError ? query.error.message : 'Could not load users.'}
        </p>
      </Card>
    )
  }

  return (
    <>
      <PageHeader
        title="User management"
        subtitle="People who can sign in for this school. Parents are added when a child is admitted."
      />
      {issued ? (
        <Card className="mb-4 grid gap-3">
          <div>
            <h3 className="mt-0">New password for {issued.name}</h3>
            <p className="m-0 text-muted">Share this login once. The password will not be shown again.</p>
          </div>
          <dl className="m-0 grid grid-cols-[120px_1fr] gap-x-3 gap-y-1.5">
            <dt className="font-bold text-muted">Email</dt>
            <dd className="m-0 font-bold">{issued.email}</dd>
            <dt className="font-bold text-muted">Password</dt>
            <dd className="m-0 font-bold">{issued.password}</dd>
          </dl>
          <div>
            <Button variant="alt" onClick={() => setIssued(null)}>
              Hide password
            </Button>
          </div>
        </Card>
      ) : null}
      {editing ? (
        <Card className="mb-4">
          <h3 className="mt-0">Edit {editing.fullName}</h3>
          <p className="mt-0 mb-3 text-[13px] text-muted">{editing.email}</p>
          <form
            className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5"
            onSubmit={form.handleSubmit((values) => save.mutate(values))}
          >
            <Field id="user-name" label="Full name" error={form.formState.errors.fullName?.message}>
              <Input id="user-name" {...form.register('fullName')} />
            </Field>
            <Field id="user-phone" label="Phone">
              <Input id="user-phone" {...form.register('phone')} />
            </Field>
            <div className="flex items-end gap-2">
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? 'Saving…' : 'Save'}
              </Button>
              <Button variant="alt" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
            {save.error instanceof ApiError ? (
              <p className="col-span-full m-0 text-[13px] text-danger">{save.error.message}</p>
            ) : null}
          </form>
        </Card>
      ) : null}
      <div className="mb-3 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Chip key={item.id} active={filter === item.id} onClick={() => setFilter(item.id)}>
            {item.label}
          </Chip>
        ))}
      </div>
      <Card>
        <Table
          rows={visible}
          rowKey={(row) => row.id}
          empty="No people match this filter. Create staff or admit a child first."
          columns={[
            { header: 'Name', cell: (row) => <b>{row.fullName}</b> },
            { header: 'Role', cell: (row) => rolePill(row.role) },
            { header: 'Email', cell: (row) => row.email },
            { header: 'Phone', cell: (row) => row.phone || '—' },
            {
              header: 'Classes',
              cell: (row) => (row.classNames.length ? row.classNames.join(', ') : '—'),
            },
            {
              header: '',
              cell: (row) => (
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="alt" className="px-3 py-1.5 text-[13px]" onClick={() => setEditing(row)}>
                    Edit
                  </Button>
                  <Button
                    variant="alt"
                    className="px-3 py-1.5 text-[13px]"
                    disabled={resetPassword.isPending}
                    onClick={() => resetPassword.mutate(row)}
                  >
                    New password
                  </Button>
                </div>
              ),
            },
          ]}
        />
        {resetPassword.error instanceof ApiError ? (
          <p className="mb-0 text-[13px] text-danger">{resetPassword.error.message}</p>
        ) : null}
      </Card>
    </>
  )
}
