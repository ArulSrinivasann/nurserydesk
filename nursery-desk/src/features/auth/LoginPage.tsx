import { useSession } from '@/app/session'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field, Input } from '@/components/ui/Input'
import { Logo } from '@/components/ui/Logo'
import { api, ApiError } from '@/lib/api'
import { zodResolver } from '@/lib/zodResolver'
import { ROLE_HOME } from '@/types/roles'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { z } from 'zod'

const schema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
  captcha: z.string().trim().min(1, 'Enter the characters from the image'),
})

type Values = z.infer<typeof schema>

type CaptchaChallenge = {
  token: string
  image: string
}

export function LoginPage() {
  const { user, loading, signIn } = useSession()
  const navigate = useNavigate()
  const [formError, setFormError] = useState('')
  const [challenge, setChallenge] = useState<CaptchaChallenge | null>(null)
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', captcha: '' },
  })

  const setCaptchaValue = form.setValue
  const loadCaptcha = useCallback(async () => {
    const data = await api<CaptchaChallenge>('/api/auth/captcha')
    setChallenge(data)
    setCaptchaValue('captcha', '')
  }, [setCaptchaValue])

  useEffect(() => {
    void loadCaptcha().catch(() => {
      setFormError('Could not load the image. Try again.')
    })
  }, [loadCaptcha])

  if (loading) {
    return <p className="p-6 text-muted">Loading…</p>
  }

  if (user) {
    return <Navigate to={ROLE_HOME[user.role]} replace />
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-[420px]">
        <Link to="/" className="text-ink no-underline">
          <Logo className="justify-center px-0 pb-7" />
        </Link>
        <Card className="px-7 py-8 shadow-[0_18px_40px_rgba(58,49,40,0.08)]">
          <h1 className="mb-7 text-center font-heading text-[32px] leading-none font-semibold">
            Sign in
          </h1>
          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit(async (values) => {
              setFormError('')
              if (!challenge) {
                setFormError('Could not load the image. Try again.')
                await loadCaptcha().catch(() => undefined)
                return
              }
              try {
                await signIn(values.email, values.password, {
                  token: challenge.token,
                  answer: values.captcha,
                })
                void navigate('/app')
              } catch (error) {
                setFormError(error instanceof ApiError ? error.message : 'Could not sign in.')
                await loadCaptcha().catch(() => undefined)
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
            <Field
              id="captcha"
              label="Type the characters in the image"
              error={form.formState.errors.captcha?.message}
            >
              <div className="mb-2 flex items-stretch gap-2.5">
                <div className="grid h-16 min-w-0 flex-1 place-items-center overflow-hidden rounded-control border border-line bg-bg">
                  {challenge ? (
                    <img
                      src={challenge.image}
                      alt="Characters to type for sign-in"
                      width={220}
                      height={64}
                      className="h-16 w-full object-contain"
                    />
                  ) : (
                    <span className="text-[13px] text-muted">Loading image…</span>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Load a new image"
                  title="Load a new image"
                  className="grid h-16 w-16 shrink-0 place-items-center rounded-control border-0 bg-primary-tint text-ink"
                  onClick={() => {
                    setFormError('')
                    void loadCaptcha().catch(() => {
                      setFormError('Could not load the image. Try again.')
                    })
                  }}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.85"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 12a8 8 0 1 1-2.2-5.5" />
                    <path d="M20 4v5h-5" />
                  </svg>
                </button>
              </div>
              <Input
                id="captcha"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={5}
                {...form.register('captcha')}
              />
            </Field>
            {formError ? <p className="m-0 text-[13px] text-danger">{formError}</p> : null}
            <Button type="submit" className="mt-1 w-full py-3 text-[16px]">
              Sign in
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
