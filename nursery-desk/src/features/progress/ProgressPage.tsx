import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Textarea } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { StatCard } from '@/components/ui/StatCard'
import { useToast } from '@/components/ui/Toast'
import { useTeacherClass } from '@/features/attendance/useTeacherClass'
import { childName, LevelPill, Trend } from '@/features/progress/bits'
import type { ProgressPayload, ProgressStudent } from '@/features/progress/types'
import { api, ApiError } from '@/lib/api'
import { LEARNING_AREAS, PROGRESS_LEVELS } from '@/lib/attendance'
import { cn } from '@/lib/cn'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function ProgressPage() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { query: classQuery, classId, className } = useTeacherClass()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ProgressStudent | null>(null)
  const query = useQuery({
    queryKey: ['teacher-progress', classId],
    enabled: Boolean(classId),
    queryFn: () => api<ProgressPayload>(`/api/teacher/progress?classId=${classId}`),
  })

  useEffect(() => {
    const students = query.data?.students ?? []
    if (students.length === 0) return
    const current = students.find((row) => row.id === selectedId) ?? students[0]
    if (!current) return
    if (!selectedId) setSelectedId(current.id)
    setDraft(current)
  }, [query.dataUpdatedAt, selectedId, query.data])

  const save = useMutation({
    mutationFn: () => {
      if (!draft || !classId) throw new Error('Pick a child.')
      return api('/api/teacher/progress', {
        method: 'PUT',
        body: JSON.stringify({
          classId,
          studentId: draft.id,
          remark: draft.remark,
          areas: draft.areas.map((area) => ({ area: area.area, level: area.level })),
        }),
      })
    },
    onSuccess: async () => {
      toast(`Progress saved for ${draft?.firstName ?? 'the child'}`)
      await queryClient.invalidateQueries({ queryKey: ['teacher-progress', classId] })
    },
    onError: (error) => {
      toast(error instanceof ApiError ? error.message : 'Could not save progress.')
    },
  })

  if (classQuery.isLoading || query.isLoading) {
    return <p className="text-muted">Loading student progress…</p>
  }
  if (!classId) {
    return (
      <Card>
        <p className="m-0 text-muted">No class is assigned to you yet. Ask the school admin to assign a class.</p>
      </Card>
    )
  }
  if (query.error || !query.data) {
    return (
      <Card>
        <p className="m-0 text-danger">
          {query.error instanceof ApiError ? query.error.message : 'Could not load progress.'}
        </p>
      </Card>
    )
  }

  const data = query.data
  const remaining = Math.max(0, data.total - data.assessed)

  return (
    <>
      <PageHeader
        title="Student progress"
        subtitle={`${className} · ${data.term.label}`}
        action={
          <Button variant="alt" onClick={() => void navigate('/teacher/reports')}>
            Class report
          </Button>
        }
      />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
        <StatCard
          label="Assessed this term"
          value={`${data.assessed} of ${data.total}`}
          hint={remaining ? `${remaining} still to do` : 'Every child assessed'}
          trend={remaining ? 'down' : 'up'}
        />
        <StatCard
          label={`Improved since ${data.previousTerm?.label ?? 'last term'}`}
          value={String(data.improved)}
          hint="children"
          trend="up"
        />
        <StatCard
          label="Need extra support"
          value={String(data.needSupport)}
          hint="At least one area at Beginning"
          trend={data.needSupport ? 'down' : 'up'}
        />
      </div>
      <Card className="mt-[26px]">
        <h3 className="mb-3">Class average by area</h3>
        <div className="grid gap-2.5">
          {data.areaAverages.map((row) => (
            <div key={row.area}>
              <div className="mb-1 flex justify-between gap-2">
                <span>{row.area}</span>
                <b>{row.average.toFixed(1)} of 4</b>
              </div>
              <ProgressBar
                value={row.average}
                max={4}
                tone={row.average < 2.6 ? 'danger' : 'success'}
                label={row.area}
              />
            </div>
          ))}
        </div>
      </Card>
      {data.students.length === 0 ? (
        <Card className="mt-[26px]">
          <p className="m-0 text-muted">No children in this class yet. Enrol a child from Admissions.</p>
        </Card>
      ) : (
        <div className="mt-[26px] grid items-start gap-4 lg:grid-cols-2">
          <div className="grid gap-2">
            {data.students.map((row, index) => (
              <button
                key={row.id}
                type="button"
                className={cn(
                  'flex w-full items-center gap-3 rounded-[14px] border-2 bg-surface px-3 py-2.5 text-left',
                  selectedId === row.id ? 'border-primary bg-primary-tint' : 'border-line',
                )}
                onClick={() => setSelectedId(row.id)}
              >
                <Avatar name={row.firstName} index={index} />
                <div className="min-w-0 flex-1">
                  <b>{childName(row)}</b>
                  <small className="block font-semibold text-muted">
                    Roll {String(row.rollNo ?? 0).padStart(2, '0')}
                  </small>
                </div>
                <LevelPill level={row.overall} />
              </button>
            ))}
          </div>
          {draft ? (
            <Card className="grid gap-3.5">
              <div className="flex items-center gap-2.5">
                <Avatar
                  name={draft.firstName}
                  index={data.students.findIndex((row) => row.id === draft.id)}
                />
                <div>
                  <h3>{childName(draft)}</h3>
                  <small className="font-semibold text-muted">Tap a level to update this term’s rating</small>
                </div>
              </div>
              {LEARNING_AREAS.map((area) => {
                const item = draft.areas.find((row) => row.area === area)
                const level = item?.level ?? 0
                return (
                  <div key={area}>
                    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                      <b>{area}</b>
                      <small className="text-muted">
                        {data.previousTerm?.label ?? 'Last term'}: {item?.previousLevel ? PROGRESS_LEVELS[item.previousLevel - 1]?.label : '—'}{' '}
                        {item ? <Trend value={item.trend} /> : null}
                      </small>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {PROGRESS_LEVELS.map((option) => (
                        <button
                          key={option.level}
                          type="button"
                          className={cn(
                            'rounded-control border px-1 py-2 text-center text-xs font-extrabold',
                            level === option.level
                              ? 'border-primary bg-primary-tint text-primary'
                              : 'border-line bg-bg',
                          )}
                          onClick={() =>
                            setDraft({
                              ...draft,
                              areas: draft.areas.map((row) =>
                                row.area === area ? { ...row, level: option.level } : row,
                              ),
                            })
                          }
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
              <Field id="remark" label="Teacher’s remarks for parents">
                <Textarea
                  id="remark"
                  rows={3}
                  value={draft.remark}
                  onChange={(event) => setDraft({ ...draft, remark: event.target.value })}
                />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button variant="alt" onClick={() => void navigate(`/teacher/reports?child=${draft.id}`)}>
                  View report card
                </Button>
                <Button disabled={save.isPending} onClick={() => save.mutate()}>
                  {save.isPending ? 'Saving…' : 'Save progress'}
                </Button>
              </div>
            </Card>
          ) : null}
        </div>
      )}
    </>
  )
}
