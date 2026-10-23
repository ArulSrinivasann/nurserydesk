import { cn } from '@/lib/cn'
import type { ReactNode } from 'react'

type Column<T> = {
  header: string
  cell: (row: T) => ReactNode
  className?: string
}

type Props<T> = {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  empty?: ReactNode
  footer?: ReactNode
  className?: string
}

export function Table<T>({ columns, rows, rowKey, empty, footer, className }: Props<T>) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.header}
                className="border-b border-line px-2.5 py-2 text-left text-[13px] font-bold text-muted"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-2.5 py-4 text-muted">
                {empty ?? 'Nothing to show yet.'}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={rowKey(row)}>
                {columns.map((column) => (
                  <td
                    key={column.header}
                    className={cn(
                      'px-2.5 py-2.5 align-middle',
                      index === rows.length - 1 ? 'border-0' : 'border-b border-line',
                      column.className,
                    )}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {footer ? <div className="pt-2.5 text-[13px] text-muted">{footer}</div> : null}
    </div>
  )
}
