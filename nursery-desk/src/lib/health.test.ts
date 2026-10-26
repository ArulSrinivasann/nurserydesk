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
