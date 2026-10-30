import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Select } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { useToast } from '@/components/ui/Toast'
import { api, ApiError } from '@/lib/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

type ClassRow = {
  id: string
  name: string
  ageRange: string | null
  capacity: number
  teacherId: string | null
}

type Payload = {
  classes: ClassRow[]
  teachers: Array<{ id: string; fullName: string }>
}

function ClassAssignmentCard({
  row,
  teachers,
  pending,
  onSave,
}: {
  row: ClassRow
  teachers: Payload['teachers']
  pending: boolean
  onSave: (classId: string, teacherId: string | null) => void
}) {
  const [teacherId, setTeacherId] = useState(row.teacherId ?? '')
  useEffect(() => {
    setTeacherId(row.teacherId ?? '')
  }, [row.teacherId])
  const dirty = teacherId !== (row.teacherId ?? '')
  const teacher = teachers.find((item) => item.id === (teacherId || row.teacherId))

  return (
    <Card>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="mt-0 mb-1">{row.name}</h3>
          <p className="m-0 text-[13px] text-muted">
            {row.ageRange ? `${row.ageRange} · ` : ''}
            Capacity {row.capacity}
            {teacher ? ` · ${teacher.fullName}` : ' · No teacher assigned'}
          </p>
        </div>
      </div>
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end">
        <Field id={`teacher-${row.id}`} label="Class teacher" className="w-full sm:max-w-[320px]">
          <Select
            id={`teacher-${row.id}`}
            value={teacherId}
            onChange={(event) => setTeacherId(event.target.value)}
          >
            <option value="">Unassigned</option>
            {teachers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.fullName}
              </option>
            ))}
          </Select>
        </Field>
        <Button
          disabled={!dirty || pending}
          onClick={() => onSave(row.id, teacherId || null)}
        >
          Save
        </Button>
      </div>
    </Card>
  )
}

export function AssignClassPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['classes'],
    queryFn: () => api<Payload>('/api/classes'),
  })
  const save = useMutation({
    mutationFn: ({ classId, teacherId }: { classId: string; teacherId: string | null }) =>
      api(`/api/staff/assignments/${classId}`, {
        method: 'PATCH',
        body: JSON.stringify({ teacherId }),
      }),
    onSuccess: () => {
      toast('Class teacher saved')
      void queryClient.invalidateQueries({ queryKey: ['classes'] })
      void queryClient.invalidateQueries({ queryKey: ['staff'] })
      void queryClient.invalidateQueries({ queryKey: ['users'] })
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

  const { classes, teachers } = query.data

  return (
    <>
      <PageHeader
        title="Assign to class"
        subtitle="Pick one teacher for each class. A teacher can lead more than one group."
      />
      {save.error instanceof ApiError ? (
        <p className="mb-3 text-[13px] text-danger">{save.error.message}</p>
      ) : null}
      {classes.length === 0 ? (
        <Card>
          <p className="m-0 text-muted">
            Add a class on the{' '}
            <Link to="/admin/classes" className="font-bold text-primary">
              Classes
            </Link>{' '}
            page first, then assign a teacher here.
          </p>
        </Card>
      ) : teachers.length === 0 ? (
        <Card>
          <p className="m-0 text-muted">
            Create a teacher on{' '}
            <Link to="/admin/users/staff" className="font-bold text-primary">
              Staff creation
            </Link>{' '}
            before assigning classes.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3.5">
          {classes.map((row) => (
            <ClassAssignmentCard
              key={row.id}
              row={row}
              teachers={teachers}
              pending={save.isPending}
              onSave={(classId, teacherId) => save.mutate({ classId, teacherId })}
            />
          ))}
        </div>
      )}
    </>
  )
}
