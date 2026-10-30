import { afterEach, describe, expect, it } from 'vitest'
import { app } from '../../server/app.ts'
import { createCaptcha, verifyCaptcha } from '../../server/captcha.ts'

describe('captcha', () => {
  const originalSecret = process.env.SESSION_SECRET

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = originalSecret
  })

  it('accepts the characters from the image once', () => {
    process.env.SESSION_SECRET = 'test-secret'
    const challenge = createCaptcha()
    expect(challenge.answer).toMatch(/^[ACDEFGHJKLMNPQRTUVWXY34679]{5}$/)
    expect(verifyCaptcha(challenge.token, challenge.answer.toLowerCase())).toBe(true)
    expect(verifyCaptcha(challenge.token, challenge.answer)).toBe(false)
  })

  it('rejects the wrong characters', () => {
    process.env.SESSION_SECRET = 'test-secret'
    const challenge = createCaptcha()
    expect(verifyCaptcha(challenge.token, 'XXXXX')).toBe(false)
  })
})

describe('GET /api/auth/captcha', () => {
  const originalSecret = process.env.SESSION_SECRET

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = originalSecret
  })

  it('returns 503 when SESSION_SECRET is missing', async () => {
    delete process.env.SESSION_SECRET
    const response = await app.request('/api/auth/captcha')
    expect(response.status).toBe(503)
  })

  it('returns an image and token', async () => {
    process.env.SESSION_SECRET = 'test-secret'
    const response = await app.request('/api/auth/captcha')
    expect(response.status).toBe(200)
    const body = (await response.json()) as { token: string; image: string }
    expect(body.token.length).toBeGreaterThan(10)
    expect(body.image.startsWith('data:image/svg+xml')).toBe(true)
  })
})
