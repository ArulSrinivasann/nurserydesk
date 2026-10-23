import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Textarea } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { useToast } from '@/components/ui/Toast'
import { useTeacherClass } from '@/features/attendance/useTeacherClass'
import { api, ApiError } from '@/lib/api'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

type Payload = {
  class: { id: string; name: string }
  childCount: number
  updates: Array<{
    id: string
    body: string
    photoPaths: string[]
    createdAt: string
    timeLabel: string
    authorName: string
  }>
}

async function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read that photo.'))
    reader.readAsDataURL(file)
  })
}

export function DailyUpdatesPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { query: classQuery, classId, className } = useTeacherClass()
  const [body, setBody] = useState('')
  const [photos, setPhotos] = useState<Array<{ fileName: string; contentType: string; dataBase64: string }>>([])
  const query = useQuery({
    queryKey: ['teacher-updates', classId],
    enabled: Boolean(classId),
    queryFn: () => api<Payload>(`/api/teacher/updates?classId=${classId}`),
  })

  const send = useMutation({
    mutationFn: () =>
      api<{ childCount: number }>('/api/teacher/updates', {
        method: 'POST',
        body: JSON.stringify({ classId, body, photos }),
      }),
    onSuccess: async (result) => {
      toast(`Update sent to ${result.childCount} parents`)
      setBody('')
      setPhotos([])
      await queryClient.invalidateQueries({ queryKey: ['teacher-updates', classId] })
    },
    onError: (error) => {
      toast(error instanceof ApiError ? error.message : 'Could not send the update.')
    },
  })

  if (classQuery.isLoading || query.isLoading) {
    return <p className="text-muted">Loading today’s timeline…</p>
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
          {query.error instanceof ApiError ? query.error.message : 'Could not load daily updates.'}
        </p>
      </Card>
    )
  }

  const updates = [...query.data.updates].reverse()

  return (
    <>
      <PageHeader title="Daily updates" subtitle={`${className} · Share a moment with parents`} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h3>Today’s timeline</h3>
          {updates.length === 0 ? (
            <p className="mb-0 mt-3.5 text-muted">No updates yet. Share the first moment of the day.</p>
          ) : (
            <ul className="mt-3.5 mb-0 grid list-none gap-3.5 p-0">
              {updates.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <span className="w-14 shrink-0 text-[13px] font-bold text-muted">{item.timeLabel}</span>
                  <div>
                    <b>{item.body}</b>
                    {item.photoPaths.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.photoPaths.map((path) => (
                          <img
                            key={path}
                            src={`/api/teacher/photos?path=${encodeURIComponent(path)}`}
                            alt=""
                            className="h-16 w-16 rounded-control object-cover"
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h3>Share a moment</h3>
          <p className="text-muted">Parents see this in their daily update.</p>
          <Field id="moment" label="What did the class enjoy today?">
            <Textarea
              id="moment"
              rows={5}
              value={body}
              placeholder="What did the class enjoy today?"
              onChange={(event) => setBody(event.target.value)}
            />
          </Field>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <label className="cursor-pointer">
              <span className="rounded-control bg-primary-tint px-4 py-2.5 font-extrabold text-primary">
                Add photos
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={(event) => {
                  const files = [...(event.target.files ?? [])]
                  void Promise.all(
                    files.map(async (file) => ({
                      fileName: file.name,
                      contentType: file.type || 'image/jpeg',
                      dataBase64: await fileToBase64(file),
                    })),
                  ).then((next) => {
                    setPhotos(next)
                    toast(next.length ? `${next.length} photo${next.length === 1 ? '' : 's'} ready` : 'Photo picker opened')
                  })
                }}
              />
            </label>
            <Button disabled={send.isPending} onClick={() => send.mutate()}>
              {send.isPending ? 'Sending…' : 'Send to parents'}
            </Button>
          </div>
          {photos.length > 0 ? (
            <p className="mb-0 mt-2 text-[13px] text-muted">{photos.length} photo{photos.length === 1 ? '' : 's'} attached.</p>
          ) : null}
        </Card>
      </div>
    </>
  )
}
