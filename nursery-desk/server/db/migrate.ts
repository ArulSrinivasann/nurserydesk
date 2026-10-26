import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

config({ path: '.env.local' })

function splitSql(file: string) {
  const statements: string[] = []
  let current = ''
  let inDollar = false
  for (let i = 0; i < file.length; i += 1) {
    if (file.startsWith('$$', i)) {
      inDollar = !inDollar
      current += '$$'
      i += 1
      continue
    }
    if (file[i] === ';' && !inDollar) {
      const statement = current.trim()
      if (statement.length > 0) statements.push(statement)
      current = ''
      continue
    }
    current += file[i]
  }
  const tail = current.trim()
  if (tail.length > 0) statements.push(tail)
  return statements
}

export async function runMigrations() {
  const url = process.env.DATABASE_URL_UNPOOLED
  if (!url) {
    throw new Error('DATABASE_URL_UNPOOLED is missing. Run neon env pull.')
  }

  const sql = neon(url)
  const dir = resolve('drizzle')
  const files = readdirSync(dir)
    .filter((name) => name.endsWith('.sql'))
    .sort()

  for (const name of files) {
    const file = readFileSync(resolve(dir, name), 'utf8')
    const statements = splitSql(file)

    for (const statement of statements) {
      await sql.query(statement)
    }
    console.log(`Applied ${statements.length} statements from drizzle/${name}`)
  }
}

const entry = process.argv[1]
if (entry && fileURLToPath(import.meta.url) === resolve(entry)) {
  await runMigrations()
}
