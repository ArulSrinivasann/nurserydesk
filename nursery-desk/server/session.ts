import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Role } from '../src/types/roles.ts'

export type AuthUser = {
  id: string
  email: string
  fullName: string
  role: Role
  schoolId: string | null
}

function secret() {
  const value = process.env.SESSION_SECRET
  if (!value) {
    throw new Error('SESSION_SECRET is missing.')
  }
  return value
}

export function signUser(user: AuthUser) {
  const payload = Buffer.from(JSON.stringify(user), 'utf8').toString('base64url')
  const mac = createHmac('sha256', secret()).update(payload).digest('base64url')
  return `${payload}.${mac}`
}

export function readUser(token: string | undefined): AuthUser | null {
  if (!token) return null
  const [payload, mac] = token.split('.')
  if (!payload || !mac) return null
  const expected = createHmac('sha256', secret()).update(payload).digest('base64url')
  const a = Buffer.from(mac)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AuthUser
  } catch {
    return null
  }
}
