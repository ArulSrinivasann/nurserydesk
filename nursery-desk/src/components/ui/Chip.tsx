import { cn } from '@/lib/cn'
import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean
}

export function Chip({ className, active = false, type = 'button', ...props }: Props) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={cn(
        'cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] font-extrabold whitespace-nowrap',
        active
          ? 'border-primary bg-primary-tint text-primary'
          : 'border-line bg-surface text-ink',
        className,
      )}
      {...props}
    />
  )
}
