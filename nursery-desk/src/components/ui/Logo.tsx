import { cn } from '@/lib/cn'

type Props = {
  className?: string
}

export function Logo({ className }: Props) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2 pb-3.5 font-heading text-[20px] font-semibold whitespace-nowrap',
        className,
      )}
    >
      <img
        src="/logo.png?v=3"
        alt=""
        width={640}
        height={545}
        className="h-10 w-auto shrink-0 object-contain"
      />
      Nursery Desk
    </div>
  )
}
