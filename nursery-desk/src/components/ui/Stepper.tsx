import { cn } from '@/lib/cn'

type Props = {
  steps: string[]
  current: number
}

export function Stepper({ steps, current }: Props) {
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {steps.map((step, index) => {
        const isCurrent = index === current
        const isDone = index < current
        return (
          <div
            key={step}
            className={cn(
              'flex items-center gap-2 rounded-full border bg-surface py-1.5 pr-3.5 pl-1.5 text-[13px] font-bold text-muted',
              isCurrent && 'border-primary text-ink',
              !isCurrent && 'border-line',
            )}
          >
            <b
              className={cn(
                'grid h-6 w-6 place-items-center rounded-full text-xs text-ink',
                isCurrent && 'bg-primary text-on-primary',
                isDone && 'bg-success text-on-primary',
                !isCurrent && !isDone && 'bg-line',
              )}
            >
              {isDone ? '✓' : index + 1}
            </b>
            {step}
          </div>
        )
      })}
    </div>
  )
}
