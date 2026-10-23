import { cn } from '@/lib/cn'
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'alt'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
}

const styles: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary',
  alt: 'bg-primary-tint text-primary',
}

export function Button({ className, variant = 'primary', type = 'button', ...props }: Props) {
  return (
    <button
      type={type}
      className={cn(
        'cursor-pointer rounded-control border-0 px-4 py-2.5 font-extrabold disabled:cursor-not-allowed disabled:opacity-40',
        styles[variant],
        className,
      )}
      {...props}
    />
  )
}
