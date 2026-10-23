import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pill } from '@/components/ui/Pill'
import { api, ApiError } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

type CardRow = {
  id: string
  title: string
  subtitle: string
  kind: 'enquiry' | 'student'
}

type Payload = {
  openCount: number
  columns: {
    enquiries: CardRow[]
    applied: CardRow[]
    documentsPending: CardRow[]
    ready: CardRow[]
  }
}

const COLUMNS: Array<{ key: keyof Payload['columns']; title: string }> = [
  { key: 'enquiries', title: 'Enquiries' },
  { key: 'applied', title: 'Applied' },
  { key: 'documentsPending', title: 'Documents pending' },
  { key: 'ready', title: 'Ready to enrol' },
]

export function AdmissionsPage() {
  const navigate = useNavigate()
  const query = useQuery({
    queryKey: ['admissions-board'],
    queryFn: () => api<Payload>('/api/admissions/board'),
  })

  if (query.isLoading) {
    return <p className="text-muted">Loading admissions…</p>
  }
  if (query.error || !query.data) {
    return (
      <Card>
        <p className="m-0 text-danger">
          {query.error instanceof ApiError ? query.error.message : 'Could not load admissions.'}
        </p>
      </Card>
    )
  }

  return (
    <>
      <PageHeader
        title="Admissions"
        subtitle={`${query.data.openCount} open applications`}
        action={<Button onClick={() => void navigate('/admin/admissions/new')}>+ New admission</Button>}
      />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
        {COLUMNS.map((column) => {
          const cards = query.data.columns[column.key]
          return (
            <div key={column.key} className="grid content-start gap-2 rounded-2xl bg-primary-tint p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base">{column.title}</h3>
                <Pill tone="info">{cards.length}</Pill>
              </div>
              {cards.length === 0 ? (
                <p className="m-0 text-[13px] text-muted">Nothing in this column yet.</p>
              ) : (
                cards.map((card, index) => (
                  <button
                    key={card.id}
                    type="button"
                    className="rounded-xl border border-line bg-surface p-2.5 text-left"
                    onClick={() =>
                      void navigate(
                        card.kind === 'enquiry'
                          ? `/admin/admissions/new?enquiry=${card.id}`
                          : '/admin/students',
                      )
                    }
                  >
                    <div className="flex items-center gap-2.5 font-bold">
                      <Avatar name={card.title} index={index} />
                      <div>
                        {card.title}
                        <div className="text-xs font-semibold text-muted">{card.subtitle}</div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
