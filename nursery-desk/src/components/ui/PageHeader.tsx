import type { ReactNode } from 'react'

type Props = {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function PageHeader({ title, subtitle, action }: Props) {
  return (
    <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2.5">
      <div>
        <h2 className="text-[22px]">{title}</h2>
        {subtitle ? <div className="text-muted">{subtitle}</div> : null}
      </div>
      {action}
    </div>
  )
}
