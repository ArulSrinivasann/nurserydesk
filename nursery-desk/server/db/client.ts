import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema.ts'

export function createDb(url: string) {
  const sql = neon(url)
  return drizzle(sql, { schema })
}

export function requireDatabaseUrl() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is missing. Run neon deploy or neon env pull.')
  }
  return url
}
