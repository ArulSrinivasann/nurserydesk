import { afterEach, describe, expect, it } from 'vitest'
import { app } from '../../server/app.ts'

describe('/api/health', () => {
  const original = process.env.DATABASE_URL

  afterEach(() => {
    if (original === undefined) {
      delete process.env.DATABASE_URL
    } else {
      process.env.DATABASE_URL = original
    }
  })

  it('returns 503 when DATABASE_URL is missing', async () => {
    delete process.env.DATABASE_URL
    const response = await app.request('/api/health')
    expect(response.status).toBe(503)
    const body = (await response.json()) as { ok: boolean }
    expect(body.ok).toBe(false)
  })
})

describe('POST /api/auth/login', () => {
  const originalUrl = process.env.DATABASE_URL
  const originalSecret = process.env.SESSION_SECRET

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = originalUrl
    if (originalSecret === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = originalSecret
  })

  it('returns 503 when SESSION_SECRET is missing', async () => {
    process.env.DATABASE_URL = 'postgres://preview'
    delete process.env.SESSION_SECRET
    const response = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'rahul@littlesprouts.example',
        password: 'NurseryDesk1!',
      }),
    })
    expect(response.status).toBe(503)
    const body = (await response.json()) as { error: string }
    expect(body.error).toContain('SESSION_SECRET')
  })
})
