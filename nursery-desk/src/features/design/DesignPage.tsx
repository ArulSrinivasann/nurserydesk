import { useTheme, type Theme } from '@/app/theme'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { Field, Input, Select, Textarea } from '@/components/ui/Input'
import { Logo } from '@/components/ui/Logo'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pill } from '@/components/ui/Pill'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { StatCard } from '@/components/ui/StatCard'
import { Stepper } from '@/components/ui/Stepper'
import { Table } from '@/components/ui/Table'
import { useToast } from '@/components/ui/Toast'
import { formatDate } from '@/lib/dates'
import { formatINR } from '@/lib/money'
import { isSupabaseConfigured } from '@/lib/supabase'
import { zodResolver } from '@/lib/zodResolver'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'

const sampleSchema = z.object({
  first: z.string().trim().min(1, 'Enter the child’s first name to continue'),
  klass: z.string(),
  notes: z.string(),
})

type SampleValues = z.infer<typeof sampleSchema>

const kids = [
  { name: 'Aarav Menon', admission: 'LS-26-041', status: 'Enrolled' },
  { name: 'Zoya Khan', admission: 'LS-26-042', status: 'Documents pending' },
  { name: 'Ishaan Rao', admission: 'LS-26-043', status: 'Enrolled' },
]

const themes: Theme[] = ['system', 'light', 'dark']

export function DesignPage() {
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const [klass, setKlass] = useState('All classes')
  const [step, setStep] = useState(2)
  const form = useForm<SampleValues>({
    resolver: zodResolver(sampleSchema),
    defaultValues: { first: '', klass: 'Nursery B', notes: '' },
  })

  return (
    <div className="mx-auto max-w-[1100px] px-3.5 py-[18px] md:px-7 md:py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Logo className="px-0 pb-0" />
        <Link to="/login" className="font-extrabold text-primary no-underline">
          Back to sign in
        </Link>
      </div>

      <PageHeader
        title="Design gallery"
        subtitle="Phase 0 shared pieces. Match these to the HTML prototype before building screens."
      />

      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Theme">
        {themes.map((item) => (
          <Chip key={item} active={theme === item} onClick={() => setTheme(item)}>
            {item}
          </Chip>
        ))}
      </div>

      <p className="mt-0 mb-6 text-muted">
        Supabase {isSupabaseConfigured ? 'is connected.' : 'is not configured yet. Copy .env.example to .env.'}{' '}
        Sample money: {formatINR(650000)} · {formatDate('2026-10-23')}
      </p>

      <h2 className="mb-3">Stat cards</h2>
      <div className="mb-8 grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
        <StatCard label="Children enrolled" value="184" hint="+6 this month" trend="up" />
        <StatCard label="Present today" value="91%" hint="−2% vs last week" trend="down" />
        <StatCard label="Fees collected (Oct)" value="₹4.2L" hint="78% of billed" trend="up" />
        <StatCard label="Overdue invoices" value="17" hint="₹86,000 pending" trend="down" />
      </div>

      <h2 className="mb-3">Buttons, pills and chips</h2>
      <Card className="mb-8">
        <div className="mb-4 flex flex-wrap gap-2">
          <Button onClick={() => toast('Progress saved')}>Save progress</Button>
          <Button variant="alt" onClick={() => toast('Invoice batch created')}>
            Generate October invoices
          </Button>
          <Button disabled>Record payment</Button>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          <Pill tone="success">Paid</Pill>
          <Pill tone="warn">Due</Pill>
          <Pill tone="danger">Overdue</Pill>
          <Pill tone="info">All classes</Pill>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by class">
          {['All classes', 'Playgroup · 32', 'Nursery · 58', 'LKG · 52'].map((item) => (
            <Chip key={item} active={klass === item} onClick={() => setKlass(item)}>
              {item}
            </Chip>
          ))}
        </div>
      </Card>

      <h2 className="mb-3">Avatars and progress</h2>
      <Card className="mb-8">
        <div className="mb-4 flex items-center gap-2.5 font-bold">
          <Avatar name="Aarav Menon" index={0} />
          Aarav Menon
        </div>
        <div className="grid gap-3">
          <div>
            <div className="mb-1 flex justify-between font-bold">
              <span>Playgroup</span>
              <span className="text-muted">32/40</span>
            </div>
            <ProgressBar value={32} max={40} label="Playgroup strength" />
          </div>
          <div>
            <div className="mb-1 flex justify-between font-bold">
              <span>Nursery</span>
              <span className="text-muted">58/60</span>
            </div>
            <ProgressBar value={58} max={60} tone="danger" label="Nursery strength" />
          </div>
        </div>
      </Card>

      <h2 className="mb-3">Table</h2>
      <Card className="mb-8">
        <Table
          columns={[
            {
              header: 'Child',
              cell: (row) => (
                <div className="flex items-center gap-2.5 font-bold">
                  <Avatar name={row.name} index={kids.indexOf(row)} />
                  {row.name}
                </div>
              ),
            },
            { header: 'Admission no.', cell: (row) => row.admission },
            {
              header: 'Status',
              cell: (row) => (
                <Pill tone={row.status === 'Enrolled' ? 'success' : 'warn'}>{row.status}</Pill>
              ),
            },
          ]}
          rows={kids}
          rowKey={(row) => row.admission}
          footer="Showing 3 of 184 children"
          empty="Add the first child with New admission."
        />
      </Card>

      <h2 className="mb-3">Stepper</h2>
      <Stepper steps={['Child', 'Parents', 'Class and fees', 'Documents', 'Review']} current={step} />
      <div className="mb-8 flex gap-2">
        <Button variant="alt" disabled={step === 0} onClick={() => setStep((value) => value - 1)}>
          Back
        </Button>
        <Button disabled={step === 4} onClick={() => setStep((value) => value + 1)}>
          Continue
        </Button>
      </div>

      <h2 className="mb-3">Form (React Hook Form + Zod)</h2>
      <Card>
        <form
          className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5"
          onSubmit={form.handleSubmit((values) => {
            toast(`Saved ${values.first}`)
            form.reset()
          })}
        >
          <Field id="first" label="First name" error={form.formState.errors.first?.message}>
            <Input id="first" placeholder="Aanya" {...form.register('first')} />
          </Field>
          <Field id="klass" label="Class">
            <Select id="klass" {...form.register('klass')}>
              <option>Playgroup</option>
              <option>Nursery B</option>
              <option>LKG</option>
              <option>UKG</option>
            </Select>
          </Field>
          <Field id="notes" label="Allergies or medical notes" className="col-span-full">
            <Textarea id="notes" rows={3} placeholder="Peanut allergy, asthma inhaler…" {...form.register('notes')} />
          </Field>
          <div className="col-span-full">
            <Button type="submit">Save sample</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
