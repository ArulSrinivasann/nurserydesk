import { cn } from '@/lib/cn'

type Props = {
  className?: string
}

export function Logo({ className }: Props) {
  return (
    <div className={cn('flex items-center gap-2.5 px-2 pb-3.5 font-heading text-[22px] font-semibold', className)}>
      <span
        aria-hidden="true"
        className="grid h-[34px] w-[34px] place-items-center rounded-[50%_50%_50%_8px] bg-sun text-lg text-[#1F2A5A]"
      >
        🌱
      </span>
      Nursery Desk
    </div>
  )
}
