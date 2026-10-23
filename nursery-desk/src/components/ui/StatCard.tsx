import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/cn'

type Trend = 'up' | 'down' | 'neutral'

type Props = {
  label: string
  value: string
  hint: string
  trend?: Trend
}

const hintColor: Record<Trend, string> = {
  up: 'text-success',
  down: 'text-danger',
  neutral: 'text-muted',
}

export function StatCard({ label, value, hint, trend = 'neutral' }: Props) {
  return (
    <Card className="stat">
      <small className="font-semibold text-muted">{label}</small>
      <strong className="mt-0.5 block font-heading text-[30px] font-semibold">{value}</strong>
      <span className={cn('text-[13px] font-bold', hintColor[trend])}>{hint}</span>
    </Card>
  )
}
