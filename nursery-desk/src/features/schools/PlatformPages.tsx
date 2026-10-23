import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pill } from '@/components/ui/Pill'
import { Table } from '@/components/ui/Table'
import { api, ApiError } from '@/lib/api'
import { formatINR } from '@/lib/money'
import { useQuery } from '@tanstack/react-query'

type SchoolRow = {
  id: string
  name: string
  status: string
  renewsOn: string | null
  trialEndsAt: string | null
  planName: string
}

type PlanRow = {
  id: string
  name: string
  pricePaise: number
  childLimit: number | null
  features: string[]
}

export function PlatformSchoolsPage() {
  const query = useQuery({
    queryKey: ['platform-schools'],
    queryFn: () => api<{ schools: SchoolRow[] }>('/api/schools'),
  })

  if (query.isLoading) {
    return <p className="text-muted">Loading schools…</p>
  }
  if (query.error || !query.data) {
    return (
      <Card>
        <p className="m-0 text-danger">
          {query.error instanceof ApiError ? query.error.message : 'Could not load schools.'}
        </p>
      </Card>
    )
  }

  const tone = (status: string) =>
    status === 'active' ? 'success' : status === 'trial' ? 'warn' : 'danger'

  return (
    <>
      <PageHeader title="Schools" subtitle="Subscriptions, usage and tenant health" />
      {query.data.schools.length === 0 ? (
        <Card>
          <p className="m-0 text-muted">No schools yet. Seed the database, then refresh.</p>
        </Card>
      ) : (
        <Card>
          <Table
            columns={[
              { header: 'School', cell: (row) => <b>{row.name}</b> },
              { header: 'Plan', cell: (row) => row.planName },
              {
                header: 'Status',
                cell: (row) => <Pill tone={tone(row.status)}>{row.status}</Pill>,
              },
              {
                header: 'Renews',
                cell: (row) => (row.renewsOn ? row.renewsOn.slice(0, 10) : row.trialEndsAt?.slice(0, 10) ?? '—'),
              },
            ]}
            rows={query.data.schools}
            rowKey={(row) => row.id}
          />
        </Card>
      )}
    </>
  )
}

export function PlatformPlansPage() {
  const query = useQuery({
    queryKey: ['plans'],
    queryFn: () => api<{ plans: PlanRow[] }>('/api/plans'),
  })

  if (query.isLoading) {
    return <p className="text-muted">Loading plans…</p>
  }
  if (query.error || !query.data) {
    return (
      <Card>
        <p className="m-0 text-danger">
          {query.error instanceof ApiError ? query.error.message : 'Could not load plans.'}
        </p>
      </Card>
    )
  }

  return (
    <>
      <PageHeader title="Plans" subtitle="Starter, Growth and Campus" />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        {query.data.plans.map((plan) => (
          <Card key={plan.id}>
            <h3>{plan.name}</h3>
            <strong className="block font-heading text-[28px] font-semibold">
              {formatINR(plan.pricePaise)}
              <small className="ml-1 font-sans text-sm font-semibold text-muted">/month</small>
            </strong>
            <p className="text-muted">
              {plan.childLimit ? `Up to ${plan.childLimit} children` : 'Unlimited children'}
              <br />
              {plan.features.join(', ')}
            </p>
          </Card>
        ))}
      </div>
    </>
  )
}
