import { cn } from '@/lib/cn'
import type { HTMLAttributes, ReactNode } from 'react'

type Props = HTMLAttributes<HTMLDivElement> & {
  title: string
  issued?: string
  schoolName: string
  schoolAddress?: string | null
  schoolContact?: string | null
  children: ReactNode
}

export function PrintSheet({
  className,
  title,
  issued,
  schoolName,
  schoolAddress,
  schoolContact,
  children,
  ...props
}: Props) {
  return (
    <div
      className={cn(
        'print-sheet grid gap-4 rounded-card border border-[#ddd] bg-white p-7 text-left text-sm text-[#1b1b1b]',
        className,
      )}
      {...props}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#1b1b1b] pb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-[42px] w-[42px] place-items-center rounded-[50%_50%_50%_8px] bg-sun text-xl" aria-hidden>
            🌱
          </span>
          <div>
            <b className="block font-heading text-[19px] font-semibold">{schoolName}</b>
            {schoolAddress ? <span className="block text-xs text-[#555]">{schoolAddress}</span> : null}
            {schoolContact ? <span className="block text-xs text-[#555]">{schoolContact}</span> : null}
          </div>
        </div>
        <div className="text-right">
          <h3 className="text-xl">{title}</h3>
          {issued ? <span className="block text-xs text-[#555]">{issued}</span> : null}
        </div>
      </div>
      {children}
    </div>
  )
}
