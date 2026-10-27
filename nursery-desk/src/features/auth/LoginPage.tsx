import { useSession } from '@/app/session'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Input'
import { Logo } from '@/components/ui/Logo'
import { ApiError } from '@/lib/api'
import { zodResolver } from '@/lib/zodResolver'
import { ROLE_HOME } from '@/types/roles'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { z } from 'zod'

const schema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
})

type Values = z.infer<typeof schema>

const demos = [
  ['Priya', 'priya@littlesprouts.example', 'School admin'],
  ['Ms. Anita', 'anita@littlesprouts.example', 'Teacher'],
  ['Rahul', 'rahul@littlesprouts.example', 'Parent'],
  ['Platform owner', 'owner@nurserydesk.example', 'Platform owner'],
]

export function LoginPage() {
  const { user, loading, signIn } = useSession()
  const navigate = useNavigate()
  const [formError, setFormError] = useState('')
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  if (loading) {
    return <p className="p-6 text-muted">Loading…</p>
  }

  if (user) {
    return <Navigate to={ROLE_HOME[user.role]} replace />
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-[520px]">
        <Link to="/" className="text-ink no-underline">
          <Logo className="justify-center px-0 pb-6" />
        </Link>
        <Card>
          <h1 className="mb-1">Sign in</h1>
          <p className="mt-0 mb-5 text-muted">Use a demo account. Password for all: NurseryDesk1!</p>
          <form
            className="grid gap-3.5"
            onSubmit={form.handleSubmit(async (values) => {
              setFormError('')
              try {
                await signIn(values.email, values.password)
                void navigate('/app')
              } catch (error) {
                setFormError(error instanceof ApiError ? error.message : 'Could not sign in.')
              }
            })}
          >
            <Field id="email" label="Email" error={form.formState.errors.email?.message}>
              <Input id="email" type="email" autoComplete="username" {...form.register('email')} />
            </Field>
            <Field id="password" label="Password" error={form.formState.errors.password?.message}>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...form.register('password')}
              />
            </Field>
            {formError ? <p className="m-0 text-[13px] text-danger">{formError}</p> : null}
            <Button type="submit">Sign in</Button>
          </form>
          <div className="mt-5 grid gap-2">
            {demos.map(([name, email, role]) => (
              <button
                key={email}
                type="button"
                className="flex w-full cursor-pointer items-center gap-3 rounded-[14px] border-2 border-line bg-surface px-3 py-2.5 text-left"
                onClick={() => {
                  form.setValue('email', email)
                  form.setValue('password', 'NurseryDesk1!')
                }}
              >
                <div className="flex-1">
                  <b>{name}</b>
                  <small className="block font-semibold text-muted">
                    {role} · {email}
                  </small>
                </div>
              </button>
            ))}
          </div>
          <Button variant="alt" className="mt-5 w-full" onClick={() => void navigate('/design')}>
            Open component gallery
          </Button>
        </Card>
      </div>
    </div>
  )
}
