import { cn } from '@/lib/cn'
import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

type FieldProps = {
  id: string
  label: string
  hint?: string
  error?: string
  children: ReactNode
  className?: string
}

export function Field({ id, label, hint, error, children, className }: FieldProps) {
  const message = error ?? hint
  return (
    <div className={cn('grid gap-1', className)}>
      <label htmlFor={id} className="text-[13px] font-bold">
        {label}
      </label>
      {children}
      {message ? (
        <p className={cn('m-0 text-[13px]', error ? 'text-danger' : 'text-muted')}>{message}</p>
      ) : null}
    </div>
  )
}

const controlClass =
  'w-full rounded-control border border-line bg-bg px-3 py-2.5 text-ink'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClass, className)} {...props} />
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(controlClass, className)} {...props} />
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(controlClass, className)} {...props} />
  },
)
