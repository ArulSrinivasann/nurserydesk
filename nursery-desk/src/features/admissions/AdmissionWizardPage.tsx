import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input, Select, Textarea } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pill } from '@/components/ui/Pill'
import { Stepper } from '@/components/ui/Stepper'
import { useToast } from '@/components/ui/Toast'
import {
  DISCOUNTS,
  DOC_KINDS,
  GENDERS,
  discountRate,
  firstInvoicePaise,
  monthlyFeeAfterDiscount,
  prefillFromEnquiry,
  type DiscountKind,
  type DocKind,
  type Gender,
} from '@/lib/admissions'
import { api, ApiError } from '@/lib/api'
import { formatINR } from '@/lib/money'
import { cn } from '@/lib/cn'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

const STEPS = ['Child', 'Parents', 'Class and fees', 'Documents', 'Review']

type Options = {
  school: {
    admissionFeePaise: number
    childLimit: number | null
    childCount: number
    yearLabel: string
  }
  classes: Array<{
    id: string
    name: string
    ageRange: string | null
    capacity: number
    enrolled: number
    seatsLeft: number
    monthlyFeePaise: number
  }>
}

type EnquiryPayload = {
  enquiries: Array<{
    id: string
    childName: string
    parentName: string
    phone: string
    classInterest: string | null
  }>
}

type Draft = {
  firstName: string
  lastName: string
  dob: string
  gender: Gender
  medicalNotes: string
  parentName: string
  phone: string
  email: string
  relationship: string
  address: string
  emergencyContact: string
  classId: string
  discountKind: DiscountKind
}

type DocFile = {
  kind: DocKind
  fileName: string
  contentType: string
  dataBase64: string
}

const emptyDraft: Draft = {
  firstName: '',
  lastName: '',
  dob: '',
  gender: 'Girl',
  medicalNotes: '',
  parentName: '',
  phone: '',
  email: '',
  relationship: '',
  address: '',
  emergencyContact: '',
  classId: '',
  discountKind: 'none',
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function AdmissionWizardPage() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const enquiryId = params.get('enquiry')
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [docs, setDocs] = useState<DocFile[]>([])
  const [done, setDone] = useState<{
    firstName: string
    admissionNo: string
    parentName: string
    firstInvoicePaise: number
  } | null>(null)

  const options = useQuery({
    queryKey: ['admission-options'],
    queryFn: () => api<Options>('/api/admissions/options'),
  })
  const enquiries = useQuery({
    queryKey: ['enquiries'],
    queryFn: () => api<EnquiryPayload>('/api/enquiries'),
    enabled: Boolean(enquiryId),
  })

  useEffect(() => {
    if (!enquiryId || !enquiries.data) return
    const enquiry = enquiries.data.enquiries.find((row) => row.id === enquiryId)
    if (!enquiry) return
    const prefill = prefillFromEnquiry(enquiry)
    const match = options.data?.classes.find((row) => row.name === enquiry.classInterest)
    setDraft((current) => ({
      ...current,
      firstName: prefill.firstName,
      lastName: prefill.lastName,
      parentName: prefill.parentName,
      phone: prefill.phone,
      gender: prefill.gender,
      classId: match?.id ?? current.classId,
    }))
  }, [enquiryId, enquiries.data, options.data])

  const selectedClass = options.data?.classes.find((row) => row.id === draft.classId)
  const rate = discountRate(draft.discountKind)
  const monthly = selectedClass ? monthlyFeeAfterDiscount(selectedClass.monthlyFeePaise, rate) : 0
  const firstInvoice = selectedClass
    ? firstInvoicePaise(options.data?.school.admissionFeePaise ?? 0, selectedClass.monthlyFeePaise, rate)
    : 0
  const atLimit =
    options.data?.school.childLimit != null &&
    options.data.school.childCount >= options.data.school.childLimit

  const enrol = useMutation({
    mutationFn: () =>
      api<{
        student: {
          firstName: string
          admissionNo: string
          parentName: string
          firstInvoicePaise: number
        }
      }>('/api/admissions', {
        method: 'POST',
        body: JSON.stringify({
          enquiryId,
          ...draft,
          documents: docs,
        }),
      }),
    onSuccess: (data) => {
      setDone({
        firstName: data.student.firstName,
        admissionNo: data.student.admissionNo,
        parentName: data.student.parentName,
        firstInvoicePaise: data.student.firstInvoicePaise,
      })
    },
  })

  const missing = useMemo(
    () => DOC_KINDS.filter((doc) => !docs.some((item) => item.kind === doc.id)).length,
    [docs],
  )

  function patch(values: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...values }))
  }

  function go(next: number) {
    if (next > step) {
      if (step === 0 && !draft.firstName.trim()) {
        toast('Enter the child’s first name to continue')
        return
      }
      if (step === 1 && (!draft.parentName.trim() || !draft.phone.trim())) {
        toast('Enter the parent’s name and phone number')
        return
      }
      if (step === 2 && !draft.classId) {
        toast('Pick a class to continue')
        return
      }
    }
    setStep(next)
  }

  async function onUpload(kind: DocKind, file: File | undefined) {
    if (!file) return
    try {
      const dataBase64 = await fileToBase64(file)
      setDocs((current) => [
        ...current.filter((item) => item.kind !== kind),
        { kind, fileName: file.name, contentType: file.type || 'application/octet-stream', dataBase64 },
      ])
    } catch {
      toast('Could not read that file.')
    }
  }

  if (options.isLoading) {
    return <p className="text-muted">Loading admission form…</p>
  }
  if (options.error || !options.data) {
    return (
      <Card>
        <p className="m-0 text-danger">
          {options.error instanceof ApiError ? options.error.message : 'Could not load admission options.'}
        </p>
      </Card>
    )
  }

  if (done) {
    return (
      <Card className="grid justify-items-center gap-2.5 px-[18px] py-9 text-center">
        <Avatar name={done.firstName} size="lg" index={3} />
        <h2>{done.firstName} is enrolled</h2>
        <div>
          Admission number <Pill tone="success">{done.admissionNo}</Pill>
        </div>
        <p className="m-0 max-w-[420px] text-muted">
          {done.parentName} will get a welcome message with login details for the parent app, and the first
          invoice of {formatINR(done.firstInvoicePaise)}.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Button
            variant="alt"
            onClick={() => {
              setDone(null)
              setDraft(emptyDraft)
              setDocs([])
              setStep(0)
            }}
          >
            Add another child
          </Button>
          <Button onClick={() => void navigate('/admin/admissions')}>Back to applications</Button>
        </div>
      </Card>
    )
  }

  let body: ReactNode = null
  if (step === 0) {
    body = (
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
        <Field id="first" label="First name">
          <Input id="first" placeholder="Aanya" value={draft.firstName} onChange={(e) => patch({ firstName: e.target.value })} />
        </Field>
        <Field id="last" label="Last name">
          <Input id="last" placeholder="Sharma" value={draft.lastName} onChange={(e) => patch({ lastName: e.target.value })} />
        </Field>
        <Field id="dob" label="Date of birth">
          <Input id="dob" type="date" value={draft.dob} onChange={(e) => patch({ dob: e.target.value })} />
        </Field>
        <div>
          <p className="mb-1 text-[13px] font-bold">Gender</p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-2.5">
            {GENDERS.map((gender) => (
              <button
                key={gender}
                type="button"
                className={cn(
                  'rounded-2xl border-2 p-3 text-left font-bold',
                  draft.gender === gender ? 'border-primary bg-primary-tint' : 'border-line bg-surface',
                )}
                onClick={() => patch({ gender })}
              >
                {gender}
              </button>
            ))}
          </div>
        </div>
        <Field id="med" label="Allergies or medical notes" className="col-span-full">
          <Textarea
            id="med"
            rows={3}
            placeholder="Peanut allergy, asthma inhaler…"
            value={draft.medicalNotes}
            onChange={(e) => patch({ medicalNotes: e.target.value })}
          />
        </Field>
      </div>
    )
  }
  if (step === 1) {
    body = (
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
        <Field id="parent" label="Parent or guardian name">
          <Input id="parent" placeholder="Rahul Sharma" value={draft.parentName} onChange={(e) => patch({ parentName: e.target.value })} />
        </Field>
        <Field id="phone" label="Mobile number">
          <Input id="phone" type="tel" placeholder="+91 98765 43210" value={draft.phone} onChange={(e) => patch({ phone: e.target.value })} />
        </Field>
        <Field id="email" label="Email (for parent app login)">
          <Input id="email" type="email" placeholder="parent@example.com" value={draft.email} onChange={(e) => patch({ email: e.target.value })} />
        </Field>
        <Field id="rel" label="Relationship">
          <Input id="rel" placeholder="Father" value={draft.relationship} onChange={(e) => patch({ relationship: e.target.value })} />
        </Field>
        <Field id="addr" label="Home address" className="col-span-full">
          <Input id="addr" value={draft.address} onChange={(e) => patch({ address: e.target.value })} />
        </Field>
        <Field id="emg" label="Emergency contact" className="col-span-full">
          <Input id="emg" placeholder="Name and number" value={draft.emergencyContact} onChange={(e) => patch({ emergencyContact: e.target.value })} />
        </Field>
      </div>
    )
  }
  if (step === 2) {
    body = (
      <>
        {atLimit ? (
          <p className="mt-0 text-danger">
            This school has reached its plan limit. Upgrade the plan to admit another child.
          </p>
        ) : null}
        <h3 className="mb-2.5">Choose a class</h3>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
          {options.data.classes.map((klass) => {
            const full = klass.seatsLeft === 0
            return (
              <button
                key={klass.id}
                type="button"
                disabled={full || atLimit}
                className={cn(
                  'grid gap-0.5 rounded-2xl border-2 p-3 text-left',
                  draft.classId === klass.id ? 'border-primary bg-primary-tint' : 'border-line bg-surface',
                )}
                onClick={() => patch({ classId: klass.id })}
              >
                <b>{klass.name}</b>
                <small className="font-semibold text-muted">{klass.ageRange}</small>
                <small className={klass.seatsLeft < 3 ? 'font-semibold text-danger' : 'font-semibold text-success'}>
                  {klass.seatsLeft} seats left
                </small>
              </button>
            )
          })}
        </div>
        <div className="mt-[18px] grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
          <Field id="disc" label="Discount">
            <Select
              id="disc"
              value={draft.discountKind}
              onChange={(e) => patch({ discountKind: e.target.value as DiscountKind })}
            >
              {DISCOUNTS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
          <Card className="bg-bg">
            <div className="flex justify-between gap-2">
              <span>One-time admission fee</span>
              <b>{formatINR(options.data.school.admissionFeePaise)}</b>
            </div>
            <div className="flex justify-between gap-2">
              <span>Monthly fee</span>
              <b>{selectedClass ? formatINR(monthly) : '—'}</b>
            </div>
            <div className="mt-2 flex justify-between gap-2 border-t border-line pt-2">
              <b>First invoice</b>
              <b>{selectedClass ? formatINR(firstInvoice) : '—'}</b>
            </div>
          </Card>
        </div>
      </>
    )
  }
  if (step === 3) {
    body = (
      <>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3>Documents</h3>
          <Pill tone={missing === 0 ? 'success' : 'warn'}>
            {DOC_KINDS.length - missing} of {DOC_KINDS.length} uploaded
          </Pill>
        </div>
        {DOC_KINDS.map((doc) => {
          const uploaded = docs.find((item) => item.kind === doc.id)
          return (
            <div key={doc.id} className="flex items-center justify-between gap-2.5 border-b border-line py-3 last:border-0">
              <span>
                {uploaded ? '✅' : '📎'} {doc.label}
                {uploaded ? <small className="ml-2 font-semibold text-muted">{uploaded.fileName}</small> : null}
              </span>
              {uploaded ? (
                <Button variant="alt" onClick={() => setDocs((current) => current.filter((item) => item.kind !== doc.id))}>
                  Remove
                </Button>
              ) : (
                <label className="cursor-pointer">
                  <span className="rounded-control bg-primary-tint px-4 py-2.5 font-extrabold text-primary">Upload</span>
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(event) => void onUpload(doc.id, event.target.files?.[0])}
                  />
                </label>
              )}
            </div>
          )
        })}
        <p className="mb-0 text-muted">
          You can enrol now and collect the rest later. Missing documents show on the student profile.
        </p>
      </>
    )
  }
  if (step === 4) {
    body = (
      <dl className="m-0 grid grid-cols-[140px_1fr] gap-x-3 gap-y-1.5">
        <dt className="font-bold text-muted">Child</dt>
        <dd className="m-0 font-bold">
          {draft.firstName} {draft.lastName} · {draft.gender}
          {draft.dob ? ` · born ${draft.dob}` : ''}
        </dd>
        <dt className="font-bold text-muted">Medical notes</dt>
        <dd className="m-0 font-bold">{draft.medicalNotes || 'None'}</dd>
        <dt className="font-bold text-muted">Parent</dt>
        <dd className="m-0 font-bold">
          {draft.parentName} · {draft.phone}
        </dd>
        <dt className="font-bold text-muted">Email</dt>
        <dd className="m-0 font-bold">{draft.email || 'Not given'}</dd>
        <dt className="font-bold text-muted">Class</dt>
        <dd className="m-0 font-bold">{selectedClass?.name ?? '—'}</dd>
        <dt className="font-bold text-muted">Fees</dt>
        <dd className="m-0 font-bold">
          {formatINR(monthly)} per month · first invoice {formatINR(firstInvoice)}
        </dd>
        <dt className="font-bold text-muted">Documents</dt>
        <dd className="m-0 font-bold">
          {missing ? <Pill tone="warn">{missing} still to collect</Pill> : <Pill tone="success">Complete</Pill>}
        </dd>
      </dl>
    )
  }

  return (
    <>
      <PageHeader
        title="New admission"
        action={
          <Button variant="alt" onClick={() => void navigate('/admin/admissions')}>
            Cancel
          </Button>
        }
      />
      <Stepper steps={STEPS} current={step} />
      <Card>{body}</Card>
      <div className="mt-4 flex justify-between gap-2">
        <Button variant="alt" disabled={step === 0} onClick={() => go(step - 1)}>
          Back
        </Button>
        {step < 4 ? (
          <Button onClick={() => go(step + 1)}>Continue</Button>
        ) : (
          <Button disabled={enrol.isPending || atLimit} onClick={() => enrol.mutate()}>
            Enrol child
          </Button>
        )}
      </div>
      {enrol.error instanceof ApiError ? <p className="text-danger">{enrol.error.message}</p> : null}
    </>
  )
}
