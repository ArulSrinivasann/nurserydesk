import { cn } from '@/lib/cn'
import type { HTMLAttributes } from 'react'

export type PillTone = 'success' | 'danger' | 'warn' | 'info'

const tones: Record<PillTone, string> = {
  success: 'bg-success-tint text-success',
  danger: 'bg-danger-tint text-danger',
  warn: 'bg-warn-tint text-warn-ink',
  info: 'bg-nav-active-bg text-nav-active',
}

type Props = HTMLAttributes<HTMLSpanElement> & {
  tone?: PillTone
}

export function Pill({ className, tone = 'info', ...props }: Props) {
  return (
    <span
      className={cn(
        'inline-block rounded-full px-2.5 py-0.5 text-xs font-extrabold',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}
