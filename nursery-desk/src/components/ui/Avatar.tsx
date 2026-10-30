import { cn } from '@/lib/cn'

export const AVATAR_PASTELS = [
  '#FFC93C',
  '#F3E6C8',
  '#FFB3C7',
  '#A8E6C1',
  '#EBDCC4',
  '#FFD3A0',
] as const

type Size = 'sm' | 'md' | 'lg'

const sizes: Record<Size, string> = {
  sm: 'h-9 w-9 text-sm',
  md: 'h-[62px] w-[62px] text-2xl',
  lg: 'h-20 w-20 text-[32px]',
}

type Props = {
  name: string
  index?: number
  size?: Size
  className?: string
}

export function Avatar({ name, index = 0, size = 'sm', className }: Props) {
  const initial = name.trim().charAt(0).toUpperCase() || '?'
  const background = AVATAR_PASTELS[index % AVATAR_PASTELS.length]

  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid shrink-0 place-items-center rounded-full font-heading font-semibold text-ink',
        sizes[size],
        className,
      )}
      style={{ background }}
    >
      {initial}
    </span>
  )
}
