import { useSession } from '@/app/session'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input, Textarea } from '@/components/ui/Input'
import { Logo } from '@/components/ui/Logo'
import { formatINR } from '@/lib/money'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

const NAV = [
  ['Features', '#features'],
  ['How it works', '#how'],
  ['Pricing', '#pricing'],
  ['FAQ', '#faq'],
] as const

const FEATURES = [
  ['📋', 'Enquiries and admissions', 'Follow a lead from the first call to the first day, with visits, notes and a five-step enrolment wizard.'],
  ['✅', 'Attendance in one tap', 'Teachers mark the class in seconds. Parents see present, absent and a short update from the day.'],
  ['💳', 'Fees, receipts and overdue', 'Monthly invoices, other fees and desk collections in paise, with a printable receipt in Indian rupees.'],
  ['🌟', 'Student progress and report cards', 'Stars, learning areas and a term report the teacher can print and the parent can keep.'],
  ['🌱', 'Parent app', 'One child, this week’s timeline, fees to pay by UPI, card or net banking, and no cash at home.'],
  ['🔒', 'Private to your school', 'School A never sees School B. Every list is scoped to the signed-in school, not the browser.'],
] as const

const ROLES = [
  ['🏫', 'School admin', 'Classes, admissions, fees and the desk — one school, one login.'],
  ['📚', 'Teachers', 'Attendance, daily updates and progress for the class they teach.'],
  ['👨‍👩‍👧', 'Parents', 'Their child only: today, fees and the report card.'],
  ['🏷️', 'Platform owner', 'Plans, schools and usage. Never student, invoice or enquiry rows.'],
] as const

const STEPS = [
  ['Add your school', 'Name, fees and classes. Capacity and a class teacher on each group.'],
  ['Bring your class', 'Convert enquiries, enrol children and print the first invoice.'],
  ['Invite teachers and parents', 'They sign in with email. Each person only sees their school or their child.'],
] as const

const PLANS = [
  {
    name: 'Starter',
    pricePaise: 149900,
    blurb: 'One school getting off paper.',
    points: ['1 school', 'Up to 100 children', 'Attendance, admissions, announcements'],
    featured: false,
  },
  {
    name: 'Growth',
    pricePaise: 349900,
    blurb: 'Most schools pick this.',
    points: ['Fees and receipts', 'Up to 250 children', 'Parent portal'],
    featured: true,
  },
  {
    name: 'Campus',
    pricePaise: 799900,
    blurb: 'Room to grow across classes.',
    points: ['Reports', 'Unlimited children', 'Everything in Growth'],
    featured: false,
  },
] as const

const FAQS = [
  [
    'Can we start with one class only?',
    'Yes. Add Nursery A today and Nursery B later. Each class has its own capacity and teacher.',
  ],
  [
    'Will parents see other schools?',
    'No. A parent only sees the child linked to their login. Another school’s announcements, fees and photos stay out of view.',
  ],
  [
    'Can we collect cash at the desk?',
    'School admins can. Parents paying in the app use UPI, card or net banking — not cash or cheque.',
  ],
] as const

const CHILDREN = ['Zoya', 'Diya', 'Meera', 'Noah', 'Aarav', 'Isha'] as const

function HeroPreview() {
  return (
    <Card className="shadow-[0_18px_40px_rgba(31,42,90,0.08)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="m-0 text-[13px] font-bold text-muted">Today in class</p>
          <b className="font-heading text-lg">Nursery A</b>
        </div>
        <span className="rounded-full bg-success-tint px-3 py-1 text-[13px] font-extrabold text-success">
          Present 22/24
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {CHILDREN.map((name, index) => (
          <div
            key={name}
            className="grid justify-items-center gap-1 rounded-[14px] border border-line bg-bg px-2 py-3"
          >
            <Avatar name={name} index={index} />
            <span className="text-[13px] font-extrabold">{name}</span>
          </div>
        ))}
      </div>
      <p className="mb-0 mt-3 rounded-[14px] bg-warn-tint px-3 py-2 text-[13px] font-extrabold text-warn-ink">
        Fees collected this month · ₹2.4L
      </p>
    </Card>
  )
}

export function LandingPage() {
  const { user } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const [demoSent, setDemoSent] = useState('')
  const appTo = user ? '/app' : '/login'

  function requestDemo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const school = String(data.get('school') ?? '').trim()
    const name = String(data.get('name') ?? '').trim()
    const phone = String(data.get('phone') ?? '').trim()
    const email = String(data.get('email') ?? '').trim()
    const note = String(data.get('note') ?? '').trim()
    const body = [
      `School: ${school}`,
      `Name: ${name}`,
      `Phone: ${phone}`,
      `Email: ${email}`,
      note ? `Note: ${note}` : '',
    ]
      .filter(Boolean)
      .join('\n')
    window.location.href = `mailto:hello@nurserydesk.online?subject=${encodeURIComponent(
      'Nursery Desk demo request',
    )}&body=${encodeURIComponent(body)}`
    setDemoSent('Your email app should open with the demo request. If it does not, write to hello@nurserydesk.online.')
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-3 px-3.5 py-3 md:px-7">
          <Logo className="px-0 pb-0" />
          <nav aria-label="Page" className="hidden items-center gap-4 lg:flex">
            {NAV.map(([label, href]) => (
              <a key={href} href={href} className="font-extrabold text-muted no-underline hover:text-ink">
                {label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <Link to={appTo} className="px-3 py-2 font-extrabold text-muted no-underline">
              {user ? 'Open app' : 'Log in'}
            </Link>
            <Button className="rounded-full px-4" onClick={() => document.getElementById('demo')?.scrollIntoView()}>
              Request a demo
            </Button>
          </div>
          <button
            type="button"
            className="rounded-control border border-line bg-surface px-3 py-2 font-extrabold md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            Menu
          </button>
        </div>
        {menuOpen ? (
          <div id="mobile-nav" className="grid gap-2 border-t border-line px-3.5 py-3 md:hidden">
            {NAV.map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="py-2 font-extrabold text-ink no-underline"
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </a>
            ))}
            <Link to={appTo} className="py-2 font-extrabold no-underline" onClick={() => setMenuOpen(false)}>
              {user ? 'Open app' : 'Log in'}
            </Link>
            <Button
              onClick={() => {
                setMenuOpen(false)
                document.getElementById('demo')?.scrollIntoView()
              }}
            >
              Request a demo
            </Button>
          </div>
        ) : null}
      </header>

      <main>
        <section className="mx-auto grid max-w-[1100px] items-center gap-10 px-3.5 py-12 md:grid-cols-[1.1fr_0.9fr] md:px-7 md:py-16">
          <div>
            <p className="m-0 inline-block rounded-full bg-primary-tint px-3 py-1 text-[13px] font-extrabold text-primary">
              Kindergarten SaaS · India-ready
            </p>
            <h1 className="mt-4 max-w-[18ch] text-[40px] leading-[1.15] md:text-[48px]">
              Run your preschool with less paperwork and more time for the children
            </h1>
            <p className="mt-4 max-w-[42ch] text-lg text-muted">
              Enquiries, attendance, fees and the parent app in one desk. Built for Indian kindergartens — rupees,
              receipts and one school’s data only.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="inline-flex rounded-full bg-primary px-5 py-2.5 font-extrabold text-on-primary no-underline"
              >
                Start 14-day free trial
              </Link>
              <Link
                to={appTo}
                className="inline-flex rounded-full bg-primary-tint px-5 py-2.5 font-extrabold text-primary no-underline"
              >
                Log in
              </Link>
            </div>
            <p className="mb-0 mt-3 text-[13px] font-bold text-muted">No credit card · Cancel anytime</p>
          </div>
          <HeroPreview />
        </section>

        <section id="features" className="border-y border-line bg-surface">
          <div className="mx-auto max-w-[1100px] px-3.5 py-14 md:px-7">
            <h2 className="text-center text-[32px]">Everything your school needs, in one place</h2>
            <p className="mx-auto mt-2 mb-8 max-w-[46ch] text-center text-muted">
              From the first enquiry to the term report. The same desk teachers, admins and parents already use.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              {FEATURES.map(([icon, title, body]) => (
                <Card key={title}>
                  <span aria-hidden="true" className="text-2xl">
                    {icon}
                  </span>
                  <h3 className="mt-2">{title}</h3>
                  <p className="mb-0 text-muted">{body}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1100px] px-3.5 py-14 md:px-7">
          <h2 className="text-center text-[32px]">One app, the right view for everyone</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map(([icon, title, body]) => (
              <Card key={title}>
                <span aria-hidden="true" className="text-2xl">
                  {icon}
                </span>
                <h3 className="mt-2">{title}</h3>
                <p className="mb-0 text-muted">{body}</p>
              </Card>
            ))}
          </div>
        </section>

        <section id="how" className="border-y border-line bg-surface">
          <div className="mx-auto max-w-[1100px] px-3.5 py-14 md:px-7">
            <h2 className="text-center text-[32px]">Up and running in three steps</h2>
            <ol className="mt-8 grid list-none gap-4 p-0 md:grid-cols-3">
              {STEPS.map(([title, body], index) => (
                <li key={title}>
                  <Card>
                    <span
                      aria-hidden="true"
                      className="grid h-9 w-9 place-items-center rounded-full bg-sun font-heading text-lg font-semibold text-[#1F2A5A]"
                    >
                      {index + 1}
                    </span>
                    <h3 className="mt-3">{title}</h3>
                    <p className="mb-0 text-muted">{body}</p>
                  </Card>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-[1100px] px-3.5 py-14 md:px-7">
          <h2 className="text-center text-[32px]">Simple pricing for every school size</h2>
          <p className="mt-2 mb-8 text-center text-muted">Starting from {formatINR(149900)} per school per month</p>
          <div className="grid items-stretch gap-4 md:grid-cols-3">
            {PLANS.map((plan) => (
              <Card
                key={plan.name}
                className={plan.featured ? 'border-2 border-primary shadow-[0_12px_28px_rgba(59,91,219,0.12)]' : ''}
              >
                {plan.featured ? (
                  <p className="m-0 mb-2 inline-block rounded-full bg-primary-tint px-3 py-1 text-[13px] font-extrabold text-primary">
                    Most schools pick this
                  </p>
                ) : null}
                <h3>{plan.name}</h3>
                <p className="font-heading text-[32px] font-semibold">
                  {formatINR(plan.pricePaise)}
                  <span className="ml-1 font-sans text-sm font-semibold text-muted">/month</span>
                </p>
                <p className="text-muted">{plan.blurb}</p>
                <ul className="mb-5 grid gap-2 p-0 pl-4 text-muted">
                  {plan.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
                <Link
                  to="/login"
                  className={
                    plan.featured
                      ? 'inline-flex w-full justify-center rounded-full bg-primary px-4 py-2.5 font-extrabold text-on-primary no-underline'
                      : 'inline-flex w-full justify-center rounded-full bg-primary-tint px-4 py-2.5 font-extrabold text-primary no-underline'
                  }
                >
                  {plan.featured ? 'Start this plan' : 'Start trial'}
                </Link>
              </Card>
            ))}
          </div>
        </section>

        <section id="faq" className="border-y border-line bg-surface">
          <div className="mx-auto max-w-[720px] px-3.5 py-14 md:px-7">
            <h2 className="mb-6 text-center text-[32px]">Questions schools ask</h2>
            <div className="grid gap-3">
              {FAQS.map(([question, answer]) => (
                <details key={question} className="rounded-card border border-line bg-bg px-4 py-3">
                  <summary className="cursor-pointer font-extrabold">{question}</summary>
                  <p className="mb-1 mt-2 text-muted">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="demo" className="bg-[#1f2a5a] px-3.5 py-14 text-white md:px-7">
          <div className="mx-auto grid max-w-[1100px] items-start gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-[32px] text-white">Ready to simplify your school day?</h2>
              <p className="text-[#c9d4f5]">
                Tell us the school name. We will set up a 14-day desk you can try with your own class list.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  to="/login"
                  className="inline-flex rounded-full bg-sun px-4 py-2.5 font-extrabold text-[#1F2A5A] no-underline"
                >
                  Log in
                </Link>
              </div>
            </div>
            <form className="grid gap-3 rounded-card bg-surface p-[18px] text-ink" onSubmit={requestDemo}>
              <Field id="demo-school" label="School name">
                <Input id="demo-school" name="school" required autoComplete="organization" />
              </Field>
              <Field id="demo-name" label="Your name">
                <Input id="demo-name" name="name" required autoComplete="name" />
              </Field>
              <Field id="demo-phone" label="Phone">
                <Input id="demo-phone" name="phone" type="tel" required autoComplete="tel" />
              </Field>
              <Field id="demo-email" label="Email">
                <Input id="demo-email" name="email" type="email" required autoComplete="email" />
              </Field>
              <Field id="demo-note" label="Anything we should know?" hint="Optional">
                <Textarea id="demo-note" name="note" rows={3} />
              </Field>
              {demoSent ? <p className="m-0 text-[13px] text-success">{demoSent}</p> : null}
              <Button type="submit" className="rounded-full">
                Request a demo
              </Button>
            </form>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-3 px-3.5 py-6 text-[13px] text-muted md:px-7">
          <Logo className="px-0 pb-0 text-base" />
          <p className="m-0">School A never sees School B. Money in rupees. Dates in en-IN.</p>
        </div>
      </footer>
    </div>
  )
}
