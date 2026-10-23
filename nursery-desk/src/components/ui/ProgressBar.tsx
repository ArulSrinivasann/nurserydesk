import { cn } from '@/lib/cn'

type Props = {
  value: number
  max?: number
  tone?: 'success' | 'danger' | 'primary'
  label?: string
}

export function ProgressBar({ value, max = 100, tone = 'success', label }: Props) {
  const pct = max === 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100))
  const fill =
    tone === 'danger' ? 'bg-danger' : tone === 'primary' ? 'bg-primary' : 'bg-success'

  return (
    <div
      className="h-2.5 overflow-hidden rounded-full bg-line"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <span className={cn('block h-full', fill)} style={{ width: `${pct}%` }} />
    </div>
  )
}
