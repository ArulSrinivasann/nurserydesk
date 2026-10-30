import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { Field, Input, Textarea } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { api, ApiError } from '@/lib/api'
import { cn } from '@/lib/cn'
import {
  COMPOSE_TEMPLATES,
  COMPOSE_TYPE_LABEL,
  COMPOSE_TYPES,
  MERGE_TAGS,
  applyMergeTags,
  smsPartCount,
  type ComposeType,
} from '@/lib/messages'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useRef, useState, type ReactNode } from 'react'

export type ComposeClass = { id: string; name: string; parentCount: number }
export type ComposeParent = {
  studentId: string
  parentFirst: string
  childFirst: string
  childName: string
  classId: string | null
  className: string
}

type Props = {
  schoolName: string
  parentCount: number
  sample: { parentFirst: string; childFirst: string }
  classes: ComposeClass[]
  parents: ComposeParent[]
}

type Audience = 'all' | 'class' | 'parents'
type Timing = 'now' | 'schedule'

function Choice({
  active,
  title,
  hint,
  onClick,
  children,
}: {
  active: boolean
  title: string
  hint: string
  onClick: () => void
  children?: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex min-w-[140px] flex-1 flex-col items-start rounded-[14px] border-2 px-3.5 py-3 text-left',
        active ? 'border-nav-active bg-nav-active-bg text-nav-active' : 'border-line bg-surface text-ink',
      )}
    >
      <span className="flex items-center gap-2 font-extrabold">
        {children}
        {title}
      </span>
      <small className={cn('mt-0.5 font-semibold', active ? 'text-nav-active' : 'text-muted')}>{hint}</small>
    </button>
  )
}

export function ComposeMessage({ schoolName, parentCount, sample, classes, parents }: Props) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const starter = COMPOSE_TEMPLATES.announcement
  const [type, setType] = useState<ComposeType>('announcement')
  const [whatsapp, setWhatsapp] = useState(true)
  const [sms, setSms] = useState(true)
  const [audience, setAudience] = useState<Audience>('all')
  const [classIds, setClassIds] = useState<string[]>([])
  const [studentIds, setStudentIds] = useState<string[]>([])
  const [title, setTitle] = useState(starter.title)
  const [body, setBody] = useState(starter.body)
  const [timing, setTiming] = useState<Timing>('now')
  const [scheduledFor, setScheduledFor] = useState('')
  const [pdfName, setPdfName] = useState<string | null>(null)

  const selectedClasses = classes.filter((row) => classIds.includes(row.id))
  const selectedParents = parents.filter((row) => studentIds.includes(row.studentId))
  const sendCount =
    audience === 'class'
      ? selectedClasses.reduce((sum, row) => sum + row.parentCount, 0)
      : audience === 'parents'
        ? selectedParents.length
        : parentCount
  const sendingTo =
    audience === 'class'
      ? selectedClasses.map((row) => row.name).join(', ') || 'Pick classes'
      : audience === 'parents'
        ? 'Selected parents'
        : 'All parents'
  const channels = [whatsapp ? 'WhatsApp' : null, sms ? 'SMS' : null].filter((item): item is string => item !== null)
  const preview = applyMergeTags(body, {
    parent: sample.parentFirst,
    child: sample.childFirst,
    school: schoolName.trim() || 'your school',
  })
  const parts = useMemo(() => smsPartCount(preview), [preview])
  const canSend =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    channels.length > 0 &&
    sendCount > 0 &&
    (timing === 'now' || scheduledFor.length > 0)

  const send = useMutation({
    mutationFn: () =>
      api<{ sent: number }>('/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          title,
          body,
          classIds: audience === 'class' ? classIds : [],
          studentIds: audience === 'parents' ? studentIds : [],
          scheduledFor: timing === 'schedule' ? scheduledFor : null,
        }),
      }),
    onSuccess: async (result) => {
      toast(
        timing === 'schedule'
          ? `Saved to send on ${scheduledFor}`
          : `Sent to ${result.sent} ${result.sent === 1 ? 'parent' : 'parents'}`,
      )
      await queryClient.invalidateQueries({ queryKey: ['messages'] })
    },
    onError: (error) => {
      toast(error instanceof ApiError ? error.message : 'Could not send the message.')
    },
  })

  function pickType(next: ComposeType) {
    const template = COMPOSE_TEMPLATES[next]
    setType(next)
    setTitle(template.title)
    setBody(template.body)
  }

  function toggleClass(id: string) {
    setClassIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  function toggleStudent(id: string) {
    setStudentIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  function insertTag(tag: string) {
    const field = bodyRef.current
    const start = field?.selectionStart ?? body.length
    const end = field?.selectionEnd ?? body.length
    const next = `${body.slice(0, start)}{${tag}}${body.slice(end)}`
    setBody(next)
    requestAnimationFrame(() => {
      field?.focus()
      const cursor = start + tag.length + 2
      field?.setSelectionRange(cursor, cursor)
    })
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
      <div className="grid gap-4">
        <Card>
          <h3>1. Message type</h3>
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Message type">
            {COMPOSE_TYPES.map((item) => (
              <Chip key={item} active={type === item} onClick={() => pickType(item)}>
                {COMPOSE_TYPE_LABEL[item]}
              </Chip>
            ))}
          </div>
          <p className="mb-0 mt-2 text-[13px] text-muted">Picking a type fills in a ready message you can edit.</p>
        </Card>

        <Card>
          <h3 className="mb-3">2. Send through</h3>
          <div className="flex flex-wrap gap-3">
            <Choice
              active={whatsapp}
              title="WhatsApp"
              hint="Photos and PDFs"
              onClick={() => setWhatsapp((value) => !value)}
            >
              <span aria-hidden="true">💬</span>
            </Choice>
            <Choice active={sms} title="SMS" hint="Works without internet data" onClick={() => setSms((value) => !value)}>
              <span aria-hidden="true">🏁</span>
            </Choice>
          </div>
        </Card>

        <Card>
          <h3 className="mb-3">3. Who should get it?</h3>
          <div className="flex flex-wrap gap-3">
            <Choice
              active={audience === 'all'}
              title="All parents"
              hint={`${parentCount} ${parentCount === 1 ? 'parent' : 'parents'}`}
              onClick={() => setAudience('all')}
            />
            <Choice
              active={audience === 'class'}
              title="By class"
              hint="Pick classes"
              onClick={() => setAudience('class')}
            />
            <Choice
              active={audience === 'parents'}
              title="Choose parents"
              hint="Tick names"
              onClick={() => setAudience('parents')}
            />
          </div>
          {audience === 'class' ? (
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Classes">
              {classes.map((row) => (
                <Chip key={row.id} active={classIds.includes(row.id)} onClick={() => toggleClass(row.id)}>
                  {row.name} · {row.parentCount}
                </Chip>
              ))}
            </div>
          ) : null}
          {audience === 'parents' ? (
            parents.length === 0 ? (
              <p className="mb-0 mt-3 text-muted">No enrolled children yet. Add students first.</p>
            ) : (
              <ul className="mt-3 mb-0 grid max-h-64 list-none gap-0 overflow-y-auto p-0">
                {parents.map((row, index) => (
                  <li key={row.studentId} className="border-b border-line last:border-b-0">
                    <label className="flex cursor-pointer items-center gap-3 py-2.5">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-nav-active"
                        checked={studentIds.includes(row.studentId)}
                        onChange={() => toggleStudent(row.studentId)}
                      />
                      <Avatar name={row.childName} index={index} />
                      <div className="min-w-0">
                        <b>{row.childName}</b>
                        <small className="block font-semibold text-muted">
                          {row.parentFirst} · {row.className}
                        </small>
                      </div>
                    </label>
                  </li>
                ))}
              </ul>
            )
          ) : null}
        </Card>

        <Card>
          <h3 className="mb-3">4. Write your message</h3>
          <Field id="msg-title" label="Title (shown in the parent app)">
            <Input
              id="msg-title"
              value={title}
              autoComplete="off"
              placeholder="Annual Day on 20 Dec"
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>
          <Field id="msg-body" label="Message" className="mt-3.5">
            <Textarea
              id="msg-body"
              ref={bodyRef}
              rows={6}
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
          </Field>
          <p className="mb-2 mt-2 text-[13px] text-muted">
            {preview.trim().length} characters · SMS: {parts} part(s)
          </p>
          <div className="flex flex-wrap gap-2">
            {MERGE_TAGS.map((tag) => (
              <Chip key={tag} onClick={() => insertTag(tag)}>
                + {`{${tag}}`}
              </Chip>
            ))}
            <Chip onClick={() => fileRef.current?.click()}>{pdfName ? pdfName : 'Attach PDF'}</Chip>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                setPdfName(file?.name ?? null)
                if (file) toast('PDF will send with WhatsApp when file sending is connected')
              }}
            />
          </div>
        </Card>
      </div>

      <div className="grid gap-4">
        <Card>
          <h3>Preview</h3>
          <p className="mt-3 mb-2 rounded-[14px] bg-success-tint p-3.5 text-[15px] text-ink">{preview || 'Write a message to preview it.'}</p>
          <p className="m-0 text-[13px] text-muted">Shown with sample names. Each parent gets their own.</p>
        </Card>
        <Card>
          <dl className="m-0 grid grid-cols-[120px_1fr] gap-x-3 gap-y-2">
            <dt className="font-bold text-muted">Type</dt>
            <dd className="m-0 font-bold">{COMPOSE_TYPE_LABEL[type]}</dd>
            <dt className="font-bold text-muted">Channel</dt>
            <dd className="m-0 font-bold">{channels.length > 0 ? channels.join(' + ') : 'Pick a channel'}</dd>
            <dt className="font-bold text-muted">Sending to</dt>
            <dd className="m-0 font-bold">{sendingTo}</dd>
            <dt className="font-bold text-muted">Parents</dt>
            <dd className="m-0 font-bold">{sendCount}</dd>
          </dl>
          <div className="mt-3.5 flex flex-wrap gap-2" role="group" aria-label="When to send">
            <Chip active={timing === 'now'} onClick={() => setTiming('now')}>
              Send now
            </Chip>
            <Chip active={timing === 'schedule'} onClick={() => setTiming('schedule')}>
              Schedule
            </Chip>
          </div>
          {timing === 'schedule' ? (
            <Field id="msg-when" label="Send at" className="mt-3">
              <Input
                id="msg-when"
                type="datetime-local"
                value={scheduledFor}
                onChange={(event) => setScheduledFor(event.target.value)}
              />
            </Field>
          ) : null}
          <Button
            className="mt-3.5 w-full"
            disabled={send.isPending || !canSend}
            onClick={() => send.mutate()}
          >
            {send.isPending
              ? 'Sending…'
              : timing === 'schedule'
                ? `Schedule for ${sendCount} ${sendCount === 1 ? 'parent' : 'parents'}`
                : `Send to ${sendCount} ${sendCount === 1 ? 'parent' : 'parents'}`}
          </Button>
        </Card>
      </div>
    </div>
  )
}
