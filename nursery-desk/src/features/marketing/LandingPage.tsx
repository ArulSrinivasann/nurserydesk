import { useSession } from '@/app/session'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input, Textarea } from '@/components/ui/Input'
import { Logo } from '@/components/ui/Logo'
import { NavIcon, type NavIconName } from '@/components/ui/NavIcon'
import { api, ApiError } from '@/lib/api'
import { formatINR, formatINRCompact } from '@/lib/money'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

const NAV = [
  ['Features', '#features'],
  ['How it works', '#how'],
  ['Pricing', '#pricing'],
  ['FAQ', '#faq'],
] as const

const FEATURES: Array<{
  icon: NavIconName
  title: string
  body: string
  points: string[]
}> = [
  {
    icon: 'enquiries',
    title: 'Enquiries and admissions',
    body: 'Keep every lead on the desk, from the first phone call or walk-in to the first day in class — so nobody is lost in a notebook.',
    points: [
      'Log calls, visits and notes on one enquiry',
      'Five-step enrolment wizard to the right class',
      'Capacity and a held seat before you confirm',
    ],
  },
  {
    icon: 'attendance',
    title: 'Attendance in one tap',
    body: 'Teachers mark the whole group in seconds. The office stops chasing paper registers, and parents see the same day on their phone.',
    points: [
      'Present or absent for Nursery A, Nursery B, and the rest',
      'A short class note goes out with the day',
      'Parents see only their child’s mark',
    ],
  },
  {
    icon: 'fees',
    title: 'Fees, receipts and overdue',
    body: 'Raise invoices and take money at the desk in paise, then print a receipt in Indian rupees. Overdue is a list you can work, not a spreadsheet.',
    points: [
      'Monthly fees, other fees and desk collections',
      'Printable receipt in ₹, dates in en-IN',
      'Parents pay by UPI, card or net banking',
    ],
  },
  {
    icon: 'document',
    title: 'Student progress and report cards',
    body: 'Score learning areas with stars through the term. The teacher prints the report; the parent keeps the same card on their phone.',
    points: [
      'Language, motor, social and the rest of your areas',
      'One term report, not a separate Word file',
      'Print at the desk or open in the parent app',
    ],
  },
  {
    icon: 'child',
    title: 'Parent app',
    body: 'A parent opens one child: this week’s timeline, a photo from class, and fees waiting to be paid. Nothing from another family, and nothing from another school.',
    points: [
      'Today, this week and the report card',
      'Pay by UPI, card or net banking — not cash at home',
      'Linked login, so they only see their child',
    ],
  },
  {
    icon: 'school',
    title: 'Private to your school',
    body: 'School A never sees School B. Every enquiry, invoice and attendance row is scoped to the signed-in school, not the browser.',
    points: [
      'One login, one school’s data',
      'Lists never mix children across tenants',
      'Built for Indian kindergartens, not a shared noticeboard',
    ],
  },
]

const STEPS: Array<{ icon: NavIconName; title: string; body: string; points: string[] }> = [
  {
    icon: 'school',
    title: 'Add your school',
    body: 'Name, fees and classes. Capacity and a class teacher on each group.',
    points: [
      'Put the school on the desk: monthly fee, admission fee and the groups you teach.',
      'Nursery A and Nursery B each get their own seats and a class teacher — not one shared list.',
    ],
  },
  {
    icon: 'classes',
    title: 'Bring your class',
    body: 'Convert enquiries, enrol children and print the first invoice.',
    points: [
      'A held seat stays with the enquiry until you confirm the first day.',
      'The invoice is in paise; the receipt prints in rupees, dated en-IN.',
    ],
  },
  {
    icon: 'students',
    title: 'Invite teachers and parents',
    body: 'They sign in with email. Each person only sees their school or their child.',
    points: [
      'Teachers mark attendance and notes for the class they teach — not the whole school.',
      'A parent opens one child. Nothing from another family, and nothing from another school.',
    ],
  },
]

function FeatureIcon({
  name,
  step,
}: {
  name: NavIconName
  step?: number
}) {
  return (
    <span className="relative mb-1 grid h-16 w-16 place-items-center">
      {step != null ? (
        <span
          aria-hidden="true"
          className="absolute -top-1 -left-1 z-10 grid h-6 w-6 place-items-center rounded-full bg-sun font-heading text-sm font-semibold text-ink"
        >
          {step}
        </span>
      ) : null}
      <span
        aria-hidden="true"
        className="grid h-16 w-16 place-items-center rounded-[18px] bg-bg shadow-[inset_0_0_0_1px_var(--line)]"
      >
        <NavIcon name={name} className="h-10 w-10" />
      </span>
    </span>
  )
}

const PLANS = [
  {
    name: 'Starter',
    pricePaise: 349900,
    blurb: 'One school getting off paper.',
    points: ['1 school', 'Up to 100 children', 'Attendance, admissions, announcements'],
    featured: false,
  },
  {
    name: 'Growth',
    pricePaise: 549900,
    blurb: 'Most schools pick this.',
    points: ['Fees and receipts', 'Up to 250 children', 'Everything in Starter'],
    featured: true,
  },
  {
    name: 'Campus',
    pricePaise: 999900,
    blurb: 'Room to grow across classes.',
    points: ['Parent portal', 'Reports', 'Unlimited children'],
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
  [
    'Do we need a credit card to start?',
    'No. We set up a 14-day desk from the school name you send us. No card, and you can stop anytime.',
  ],
  [
    'Which plan includes the parent portal?',
    'Campus. Growth is fees and receipts at the desk. Starter is attendance, admissions and announcements for up to 100 children.',
  ],
] as const

const CHILDREN = ['Zoya', 'Diya', 'Meera', 'Noah', 'Aarav', 'Isha'] as const

const HERO_SLIDES: Array<{
  id: string
  kicker: string
  title: string
  body: string
  preview: 'attendance' | 'fees' | 'admissions' | 'parent' | 'progress'
}> = [
  {
    id: 'attendance',
    kicker: 'Kindergarten SaaS · India-ready',
    title: 'Run your preschool with less paperwork and more time for the children',
    body: 'Enquiries, attendance, fees and the parent app in one desk. Built for Indian kindergartens — rupees, receipts and one school’s data only.',
    preview: 'attendance',
  },
  {
    id: 'fees',
    kicker: 'Fees and receipts',
    title: 'Collect fees, print receipts and chase overdue in rupees',
    body: 'Monthly invoices, other fees and desk collections in paise. Parents can pay by UPI, card or net banking.',
    preview: 'fees',
  },
  {
    id: 'admissions',
    kicker: 'Enquiries and admissions',
    title: 'Follow a lead from the first call to the first day',
    body: 'Visits, notes and a five-step enrolment wizard, without losing the enquiry in a notebook.',
    preview: 'admissions',
  },
  {
    id: 'parent',
    kicker: 'Parent app',
    title: 'One child, this week’s timeline, and fees to pay',
    body: 'A parent only sees their child. No other school’s announcements, invoices or photos.',
    preview: 'parent',
  },
  {
    id: 'progress',
    kicker: 'Progress and reports',
    title: 'Stars, learning areas and a term report to keep',
    body: 'The teacher scores the class. The parent can open the report on their phone and print it at the desk.',
    preview: 'progress',
  },
]

function PreviewFrame({
  icon,
  kicker,
  title,
  badge,
  children,
  footer,
}: {
  icon: NavIconName
  kicker: string
  title: string
  badge?: ReactNode
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <Card className="grid min-h-[340px] content-start shadow-[0_18px_40px_rgba(58,49,40,0.08)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="grid h-11 w-11 place-items-center rounded-[14px] bg-bg shadow-[inset_0_0_0_1px_var(--line)]"
          >
            <NavIcon name={icon} className="h-7 w-7" />
          </span>
          <div>
            <p className="m-0 text-[13px] font-bold text-muted">{kicker}</p>
            <b className="font-heading text-lg">{title}</b>
          </div>
        </div>
        {badge}
      </div>
      {children}
      <div className="mt-3">{footer}</div>
    </Card>
  )
}

function AttendancePreview() {
  return (
    <PreviewFrame
      icon="classes"
      kicker="Today in class"
      title="Nursery A"
      badge={
        <span className="rounded-full bg-success-tint px-3 py-1 text-[13px] font-extrabold text-success">
          Present 22/24
        </span>
      }
      footer={
        <p className="mb-0 flex items-center gap-2.5 rounded-[14px] bg-warn-tint px-3 py-2 text-[13px] font-extrabold text-warn-ink">
          <span
            aria-hidden="true"
            className="grid h-8 w-8 place-items-center rounded-[10px] bg-surface"
          >
            <NavIcon name="fees" className="h-5 w-5" />
          </span>
          Fees collected this month · {formatINRCompact(24000000)}
        </p>
      }
    >
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
    </PreviewFrame>
  )
}

function FeesPreview() {
  const rows: Array<[string, string, 'success' | 'danger' | 'warn', number]> = [
    ['Zoya', 'Overdue', 'danger', 850000],
    ['Diya', 'Paid', 'success', 0],
    ['Aarav', 'Due 5 Nov', 'warn', 650000],
  ]
  return (
    <PreviewFrame
      icon="fees"
      kicker="This month"
      title="Fee desk"
      badge={
        <span className="rounded-full bg-danger-tint px-3 py-1 text-[13px] font-extrabold text-danger">
          4 overdue
        </span>
      }
      footer={
        <p className="mb-0 flex items-center gap-2.5 rounded-[14px] bg-success-tint px-3 py-2 text-[13px] font-extrabold text-success">
          Collected this month · {formatINRCompact(24000000)}
        </p>
      }
    >
      <div className="grid gap-2">
        {rows.map(([name, status, tone, paise], index) => (
          <div
            key={name}
            className="flex items-center gap-2.5 rounded-[14px] border border-line bg-bg px-3 py-2.5"
          >
            <Avatar name={name} index={index} />
            <div className="min-w-0 flex-1">
              <b className="block text-[14px]">{name}</b>
              <span className="text-[13px] font-bold text-muted">
                {paise ? formatINR(paise) : 'Receipt printed'}
              </span>
            </div>
            <span
              className={
                tone === 'success'
                  ? 'text-[13px] font-extrabold text-success'
                  : tone === 'danger'
                    ? 'text-[13px] font-extrabold text-danger'
                    : 'text-[13px] font-extrabold text-warn-ink'
              }
            >
              {status}
            </span>
          </div>
        ))}
      </div>
    </PreviewFrame>
  )
}

function AdmissionsPreview() {
  const rows = [
    ['Meera', 'New call', 'Today'],
    ['Noah', 'Visit booked', 'Thu 10:30'],
    ['Isha', 'Offer sent', 'Seat held'],
  ]
  return (
    <PreviewFrame
      icon="admissions"
      kicker="Enrolment"
      title="Enquiries"
      badge={
        <span className="rounded-full bg-nav-active-bg px-3 py-1 text-[13px] font-extrabold text-nav-active">
          3 new
        </span>
      }
      footer={
        <p className="mb-0 rounded-[14px] bg-primary-tint px-3 py-2 text-[13px] font-extrabold text-primary">
          Five-step wizard · Call → visit → offer → pay → start
        </p>
      }
    >
      <div className="grid gap-2">
        {rows.map(([name, step, when], index) => (
          <div
            key={name}
            className="flex items-center gap-2.5 rounded-[14px] border border-line bg-bg px-3 py-2.5"
          >
            <Avatar name={name} index={index + 2} />
            <div className="min-w-0 flex-1">
              <b className="block text-[14px]">{name}</b>
              <span className="text-[13px] font-bold text-muted">{step}</span>
            </div>
            <span className="text-[13px] font-extrabold text-muted">{when}</span>
          </div>
        ))}
      </div>
    </PreviewFrame>
  )
}

function ParentPreview() {
  const rows = [
    ['Mon', 'Present · snack time photo'],
    ['Tue', 'Art · yellow or orange'],
    ['Wed', 'Fee due · pay by UPI'],
  ]
  return (
    <PreviewFrame
      icon="child"
      kicker="Parent view"
      title="Zoya this week"
      badge={
        <span className="rounded-full bg-success-tint px-3 py-1 text-[13px] font-extrabold text-success">
          Their child only
        </span>
      }
      footer={
        <p className="mb-0 flex items-center gap-2.5 rounded-[14px] bg-primary-tint px-3 py-2 text-[13px] font-extrabold text-primary">
          <span
            aria-hidden="true"
            className="grid h-8 w-8 place-items-center rounded-[10px] bg-surface"
          >
            <NavIcon name="collect" className="h-5 w-5" />
          </span>
          Pay fees · UPI, card or net banking
        </p>
      }
    >
      <div className="grid gap-2">
        {rows.map(([day, detail], index) => (
          <div
            key={day}
            className="flex items-center gap-2.5 rounded-[14px] border border-line bg-bg px-3 py-2.5"
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-sun font-heading text-sm font-semibold">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <b className="block text-[14px]">{day}</b>
              <span className="text-[13px] font-bold text-muted">{detail}</span>
            </div>
          </div>
        ))}
      </div>
    </PreviewFrame>
  )
}

function ProgressPreview() {
  const rows = [
    ['Language', 4],
    ['Motor', 5],
    ['Social', 4],
  ]
  return (
    <PreviewFrame
      icon="progress"
      kicker="Term report"
      title="Nursery A"
      badge={
        <span className="rounded-full bg-warn-tint px-3 py-1 text-[13px] font-extrabold text-warn-ink">
          Ready to print
        </span>
      }
      footer={
        <p className="mb-0 rounded-[14px] bg-success-tint px-3 py-2 text-[13px] font-extrabold text-success">
          Teacher scores · parent keeps a copy
        </p>
      }
    >
      <div className="mb-2 flex items-center gap-2.5 rounded-[14px] border border-line bg-bg px-3 py-2.5">
        <Avatar name="Zoya" index={0} />
        <div>
          <b className="block text-[14px]">Zoya</b>
          <span className="text-[13px] font-bold text-muted">Roll 12 · Nursery A</span>
        </div>
      </div>
      <div className="grid gap-2">
        {rows.map(([area, stars]) => (
          <div
            key={area}
            className="flex items-center justify-between gap-2 rounded-[14px] border border-line bg-bg px-3 py-2.5"
          >
            <span className="text-[14px] font-extrabold">{area}</span>
            <span className="tracking-wide text-sun" aria-label={`${stars} of 5 stars`}>
              {'★'.repeat(stars)}
              <span className="text-line">{'★'.repeat(5 - stars)}</span>
            </span>
          </div>
        ))}
      </div>
    </PreviewFrame>
  )
}

const PREVIEWS = {
  attendance: <AttendancePreview />,
  fees: <FeesPreview />,
  admissions: <AdmissionsPreview />,
  parent: <ParentPreview />,
  progress: <ProgressPreview />,
}

function HeroSlider({ appTo }: { appTo: string }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = HERO_SLIDES.length
  const slide = HERO_SLIDES[index]

  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count)
    }, 6500)
    return () => window.clearInterval(timer)
  }, [count, index, paused])

  function goTo(next: number) {
    setIndex((next + count) % count)
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Product features"
      className="mx-auto max-w-[1100px] px-3.5 py-12 md:px-7 md:py-16"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="grid items-center gap-10 md:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="m-0 inline-block rounded-full bg-primary-tint px-3 py-1 text-[13px] font-extrabold text-primary">
            {slide.kicker}
          </p>
          <h1
            aria-live="polite"
            className="mt-4 min-h-[4.6em] max-w-[18ch] text-[40px] leading-[1.15] md:min-h-[3.5em] md:text-[48px]"
          >
            {slide.title}
          </h1>
          <p className="mt-4 min-h-[4.5em] max-w-[42ch] text-lg text-muted">{slide.body}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="#demo"
              className="inline-flex rounded-full bg-primary px-5 py-2.5 font-extrabold text-on-primary no-underline"
            >
              Start 14-day free trial
            </a>
            <Link
              to={appTo}
              className="inline-flex rounded-full bg-primary-tint px-5 py-2.5 font-extrabold text-primary no-underline"
            >
              Log in
            </Link>
          </div>
          <p className="mb-0 mt-3 text-[13px] font-bold text-muted">No credit card · Cancel anytime</p>
        </div>
        <div aria-hidden="true">{PREVIEWS[slide.preview]}</div>
      </div>
      <div className="mt-8 flex items-center justify-center gap-3">
        <button
          type="button"
          aria-label="Previous feature"
          className="grid h-10 w-10 place-items-center rounded-full border-0 bg-surface text-ink shadow-[0_8px_20px_rgba(58,49,40,0.08)]"
          onClick={() => goTo(index - 1)}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6 9 12l6 6" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          {HERO_SLIDES.map((item, slideIndex) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Show ${item.kicker}`}
              aria-current={slideIndex === index ? 'true' : undefined}
              className={
                slideIndex === index
                  ? 'h-2.5 w-7 rounded-full border-0 bg-primary'
                  : 'h-2.5 w-2.5 rounded-full border-0 bg-line'
              }
              onClick={() => goTo(slideIndex)}
            />
          ))}
        </div>
        <button
          type="button"
          aria-label="Next feature"
          className="grid h-10 w-10 place-items-center rounded-full border-0 bg-surface text-ink shadow-[0_8px_20px_rgba(58,49,40,0.08)]"
          onClick={() => goTo(index + 1)}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      </div>
    </section>
  )
}

export function LandingPage() {
  const { user } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const [demoSent, setDemoSent] = useState('')
  const [demoError, setDemoError] = useState('')
  const [demoBusy, setDemoBusy] = useState(false)
  const appTo = user ? '/app' : '/login'

  async function requestDemo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    setDemoBusy(true)
    setDemoError('')
    setDemoSent('')
    try {
      await api('/api/demo-requests', {
        method: 'POST',
        body: JSON.stringify({
          school: String(data.get('school') ?? ''),
          name: String(data.get('name') ?? ''),
          phone: String(data.get('phone') ?? ''),
          email: String(data.get('email') ?? ''),
          note: String(data.get('note') ?? ''),
        }),
      })
      form.reset()
      setDemoSent('We have your request. We will set up a trial desk and write back to this email.')
    } catch (error) {
      setDemoError(error instanceof ApiError ? error.message : 'Could not send the request. Try again.')
    } finally {
      setDemoBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-3 px-3.5 py-3 md:px-7">
          <Logo className="px-0 pb-0" />
          <nav aria-label="Page" className="hidden items-center gap-10 lg:flex">
            {NAV.map(([label, href]) => (
              <a key={href} href={href} className="text-[16px] font-semibold text-muted no-underline hover:text-ink">
                {label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <Link to={appTo} className="px-3 py-2 text-[16px] font-semibold text-muted no-underline">
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
                className="py-2 text-[16px] font-semibold text-ink no-underline"
                onClick={() => setMenuOpen(false)}
              >
                {label}
              </a>
            ))}
            <Link to={appTo} className="py-2 text-[16px] font-semibold no-underline" onClick={() => setMenuOpen(false)}>
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
        <HeroSlider appTo={appTo} />

        <section id="features" className="border-y border-line bg-surface">
          <div className="mx-auto max-w-[1100px] px-3.5 py-14 md:px-7">
            <h2 className="text-center text-[32px]">Everything your school needs, in one place</h2>
            <p className="mx-auto mt-2 mb-8 max-w-[46ch] text-center text-muted">
              From the first enquiry to the term report. The same desk teachers, admins and parents already use.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              {FEATURES.map((feature) => (
                <Card key={feature.title} className="grid content-start gap-3 p-[22px]">
                  <div className="flex justify-center">
                    <FeatureIcon name={feature.icon} />
                  </div>
                  <h3 className="text-center text-[20px] leading-snug">{feature.title}</h3>
                  <p className="mb-0 text-muted">{feature.body}</p>
                  <ul className="m-0 grid list-none gap-2 p-0 text-[14px] text-muted">
                    {feature.points.map((point) => (
                      <li key={point} className="flex gap-2.5">
                        <span
                          aria-hidden="true"
                          className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                        />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#3a3128]">
          <img src="/landing-help-banner.jpg" alt="" className="block w-full" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[38%] bg-gradient-to-b from-[#3a3128]/75 to-transparent"
          />
          <div className="absolute inset-x-0 top-0 z-10 flex flex-col items-center px-3.5 pt-8 text-center md:px-7 md:pt-10">
            <h2 className="m-0 w-full text-center text-[32px] leading-[1.15] text-white [text-shadow:0_2px_14px_rgba(58,49,40,0.65)] md:text-[40px]">
              Need a hand choosing the right desk for your school?
            </h2>
            <p className="mx-auto mt-1.5 mb-0 max-w-[42ch] text-center leading-snug text-[#f4ede3] [text-shadow:0_1px_10px_rgba(58,49,40,0.6)]">
              Tell us the school name. We will write back and set up a 14-day trial with your own class list.
            </p>
            <a
              href="#demo"
              className="mt-3 inline-flex rounded-full bg-surface px-6 py-2 font-extrabold text-ink no-underline shadow-[0_8px_20px_rgba(58,49,40,0.28)]"
            >
              Get in touch
            </a>
          </div>
        </section>

        <section id="how" className="border-b border-line bg-surface">
          <div className="mx-auto max-w-[1100px] px-3.5 py-14 md:px-7">
            <h2 className="text-center text-[32px]">Up and running in three steps</h2>
            <ol className="mt-8 grid list-none gap-4 p-0 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title}>
                  <Card className="grid content-start gap-3 p-[22px]">
                    <div className="flex justify-center">
                      <FeatureIcon name={step.icon} step={index + 1} />
                    </div>
                    <h3 className="text-center text-[20px] leading-snug">{step.title}</h3>
                    <p className="mb-0 text-muted">{step.body}</p>
                    <ul className="m-0 grid list-none gap-2 p-0 text-[14px] text-muted">
                      {step.points.map((point) => (
                        <li key={point} className="flex gap-2.5">
                          <span
                            aria-hidden="true"
                            className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                          />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-[1100px] px-3.5 py-14 md:px-7">
          <h2 className="text-center text-[32px]">Simple pricing for every school size</h2>
          <p className="mt-2 mb-8 text-center text-muted">Starting from {formatINR(349900)} per school per month</p>
          <div className="grid items-stretch gap-4 md:grid-cols-3">
            {PLANS.map((plan) => (
              <Card
                key={plan.name}
                className={
                  plan.featured
                    ? 'flex h-full flex-col gap-3 border-2 border-primary p-[22px] shadow-[0_12px_28px_rgba(112,85,54,0.14)]'
                    : 'flex h-full flex-col gap-3 p-[22px]'
                }
              >
                <div className="flex min-h-[28px] justify-center">
                  {plan.featured ? (
                    <p className="m-0 rounded-full bg-primary-tint px-3 py-1 text-[13px] font-extrabold text-primary">
                      Most schools pick this
                    </p>
                  ) : null}
                </div>
                <div className="flex justify-center">
                  <FeatureIcon
                    name={plan.name === 'Starter' ? 'school' : plan.name === 'Growth' ? 'fees' : 'report'}
                  />
                </div>
                <h3 className="text-center text-[20px] leading-snug">{plan.name}</h3>
                <p className="m-0 text-center font-heading text-[32px] font-semibold">
                  {formatINR(plan.pricePaise)}
                  <span className="ml-1 font-sans text-sm font-semibold text-muted">/month</span>
                </p>
                <p className="m-0 text-center text-muted">{plan.blurb}</p>
                <ul className="m-0 grid flex-1 list-none gap-2 p-0 text-[14px] text-muted">
                  {plan.points.map((point) => (
                    <li key={point} className="flex gap-2.5">
                      <span
                        aria-hidden="true"
                        className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                      />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="#demo"
                  className={
                    plan.featured
                      ? 'mt-2 inline-flex w-full justify-center rounded-full bg-primary px-4 py-2.5 font-extrabold text-on-primary no-underline'
                      : 'mt-2 inline-flex w-full justify-center rounded-full bg-primary-tint px-4 py-2.5 font-extrabold text-primary no-underline'
                  }
                >
                  {plan.featured ? 'Start this plan' : 'Start trial'}
                </a>
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

        <section id="demo" className="bg-[#3a3128] px-3.5 py-14 text-white md:px-7">
          <div className="mx-auto grid max-w-[1100px] items-start gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-[32px] text-white">Ready to simplify your school day?</h2>
              <p className="text-[#e8dccb]">
                Tell us the school name. We will set up a 14-day desk you can try with your own class list.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  to="/login"
                  className="inline-flex rounded-full bg-sun px-4 py-2.5 font-extrabold text-ink no-underline"
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
              {demoError ? <p className="m-0 text-[13px] text-danger">{demoError}</p> : null}
              <Button type="submit" className="rounded-full" disabled={demoBusy}>
                {demoBusy ? 'Sending…' : 'Request a demo'}
              </Button>
            </form>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-3 px-3.5 py-6 text-[13px] text-muted md:px-7">
          <Logo className="px-0 pb-0 text-base" />
          <p className="m-0">2026 @ copyrights reserved</p>
        </div>
      </footer>
    </div>
  )
}
