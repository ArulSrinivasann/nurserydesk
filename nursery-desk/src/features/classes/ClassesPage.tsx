import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input, Select } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { useToast } from '@/components/ui/Toast'
import { api, ApiError } from '@/lib/api'
import { zodResolver } from '@/lib/zodResolver'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const schema = z.object({
  name: z.string().trim().min(1, 'Enter the class name'),
  ageRange: z.string(),
  capacity: z.string().min(1, 'Enter capacity'),
  academicYearId: z.string().min(1, 'Pick a year'),
  teacherId: z.string(),
  monthlyFeeRupees: z.string().min(1, 'Enter the monthly fee'),
})

type Values = z.infer<typeof schema>

type ClassRow = {
  id: string
  name: string
  ageRange: string | null
  capacity: number
  teacherId: string | null
  academicYearId: string
  monthlyFeePaise: number
}

type Payload = {
  classes: ClassRow[]
  teachers: Array<{ id: string; fullName: string }>
  years: Array<{ id: string; label: string; isCurrent: boolean }>
}

export function ClassesPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<ClassRow | null>(null)
  const [formNonce, setFormNonce] = useState(0)
  const query = useQuery({
    queryKey: ['classes'],
    queryFn: () => api<Payload>('/api/classes'),
  })

  const save = useMutation({
    mutationFn: (values: Values) => {
      const body = {
        name: values.name,
        ageRange: values.ageRange,
        capacity: Number(values.capacity),
        academicYearId: values.academicYearId,
        teacherId: values.teacherId || null,
        monthlyFeePaise: Math.round(Number(values.monthlyFeeRupees) * 100),
      }
      return editing
        ? api(`/api/classes/${editing.id}`, { method: 'PATCH', body: JSON.stringify(body) })
        : api('/api/classes', { method: 'POST', body: JSON.stringify(body) })
    },
    onSuccess: () => {
      toast(editing ? 'Class saved' : 'Class created')
      setEditing(null)
      setFormNonce((value) => value + 1)
      void queryClient.invalidateQueries({ queryKey: ['classes'] })
    },
  })

  if (query.isLoading) {
    return <p className="text-muted">Loading classes…</p>
  }
  if (query.error || !query.data) {
    return (
      <Card>
        <p className="m-0 text-danger">
          {query.error instanceof ApiError ? query.error.message : 'Could not load classes.'}
        </p>
      </Card>
    )
  }

  const { classes, teachers, years } = query.data
  const currentYear = years.find((year) => year.isCurrent) ?? years[0]

  return (
    <>
      <PageHeader
        title="Classes"
        subtitle="One row per teachable group, such as Nursery A and Nursery B"
        action={
          editing ? (
            <Button variant="alt" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          ) : null
        }
      />
      {classes.length === 0 ? (
        <Card className="mb-4">
          <p className="m-0 text-muted">Add the first class so teachers can take attendance later.</p>
        </Card>
      ) : (
        <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
          {classes.map((row) => {
            const teacher = teachers.find((item) => item.id === row.teacherId)
            const full = row.capacity > 0 && 0 / row.capacity > 0.95
            return (
              <button
                key={row.id}
                type="button"
                className="rounded-[14px] border-2 border-line bg-surface p-3 text-left"
                onClick={() => setEditing(row)}
              >
                <div className="mb-1 flex justify-between gap-2">
                  <b>{row.name}</b>
                  <span className="font-bold">0/{row.capacity}</span>
                </div>
                <small className="block font-semibold text-muted">
                  {teacher ? `Class teacher: ${teacher.fullName}` : 'No teacher assigned'}
                  {row.ageRange ? ` · ${row.ageRange}` : ''}
                </small>
                <div className="mt-2">
                  <ProgressBar value={0} max={row.capacity} tone={full ? 'danger' : 'success'} label={row.name} />
                </div>
              </button>
            )
          })}
        </div>
      )}
      <ClassForm
        key={editing?.id ?? `new-${formNonce}`}
        years={years}
        teachers={teachers}
        defaultYearId={editing?.academicYearId ?? currentYear?.id ?? ''}
        editing={editing}
        error={save.error instanceof ApiError ? save.error.message : undefined}
        pending={save.isPending}
        onSubmit={(values) => save.mutate(values)}
      />
    </>
  )
}

function ClassForm({
  years,
  teachers,
  defaultYearId,
  editing,
  error,
  pending,
  onSubmit,
}: {
  years: Payload['years']
  teachers: Payload['teachers']
  defaultYearId: string
  editing: ClassRow | null
  error?: string
  pending: boolean
  onSubmit: (values: Values) => void
}) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: editing?.name ?? '',
      ageRange: editing?.ageRange ?? '',
      capacity: editing ? String(editing.capacity) : '30',
      academicYearId: defaultYearId,
      teacherId: editing?.teacherId ?? '',
      monthlyFeeRupees: editing ? String(editing.monthlyFeePaise / 100) : '6500',
    },
  })

  return (
    <Card>
      <h3 className="mb-3">{editing ? `Edit ${editing.name}` : 'Add a class'}</h3>
      {years.length === 0 ? (
        <p className="m-0 text-muted">Add an academic year on the School page first.</p>
      ) : (
        <form
          className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <Field id="class-name" label="Name" error={form.formState.errors.name?.message}>
            <Input id="class-name" placeholder="Nursery B" {...form.register('name')} />
          </Field>
          <Field id="ageRange" label="Age range">
            <Input id="ageRange" placeholder="3–4 years" {...form.register('ageRange')} />
          </Field>
          <Field id="capacity" label="Capacity" error={form.formState.errors.capacity?.message}>
            <Input id="capacity" type="number" min="1" {...form.register('capacity')} />
          </Field>
          <Field id="academicYearId" label="Academic year">
            <Select id="academicYearId" {...form.register('academicYearId')}>
              {years.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.label}
                  {year.isCurrent ? ' (current)' : ''}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="teacherId" label="Class teacher">
            <Select id="teacherId" {...form.register('teacherId')}>
              <option value="">Unassigned</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.fullName}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="monthlyFeeRupees" label="Monthly fee (₹)" error={form.formState.errors.monthlyFeeRupees?.message}>
            <Input id="monthlyFeeRupees" type="number" min="0" {...form.register('monthlyFeeRupees')} />
          </Field>
          <div className="flex items-end">
            <Button type="submit" disabled={pending}>
              {editing ? 'Save class' : 'Create class'}
            </Button>
          </div>
          {error ? <p className="col-span-full m-0 text-[13px] text-danger">{error}</p> : null}
        </form>
      )}
    </Card>
  )
}
