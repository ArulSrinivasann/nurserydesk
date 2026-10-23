import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: '.env.local' })

const url = process.env.DATABASE_URL_UNPOOLED
if (!url) {
  throw new Error('DATABASE_URL_UNPOOLED is missing. Run neon env pull.')
}

export default defineConfig({
  schema: './server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url },
})
