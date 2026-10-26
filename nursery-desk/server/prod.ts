import { config } from 'dotenv'
import { spawnSync } from 'node:child_process'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer, type ServerResponse } from 'node:http'
import { extname, join, resolve, sep } from 'node:path'
import { app } from './app.ts'
import { pipeHonoToNode } from './http-node.ts'

config({ path: '.env.local' })

const HOST = process.env.HOST ?? '0.0.0.0'
const PORT = Number(process.env.PORT ?? 4173)
if (!Number.isFinite(PORT) || PORT <= 0) {
  throw new Error(`PORT must be a positive number (got ${process.env.PORT ?? ''}).`)
}
const DIST = resolve(process.cwd(), 'dist')

const MIME: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function ensureDist() {
  if (existsSync(join(DIST, 'index.html'))) return
  console.log('dist/ is missing; running npm run build')
  const result = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', shell: true })
  if (result.status !== 0 || !existsSync(join(DIST, 'index.html'))) {
    console.error('Build failed. The production server needs dist/index.html.')
    process.exit(result.status ?? 1)
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

function safeFile(urlPath: string) {
  const relative = decodeURIComponent(urlPath).replace(/^\/+/, '')
  const full = resolve(DIST, relative)
  if (full !== DIST && !full.startsWith(DIST + sep)) return null
  if (!existsSync(full)) return null
  const stat = statSync(full)
  if (!stat.isFile()) return null
  return full
}

function sendFile(res: ServerResponse, file: string, method: string) {
  const type = MIME[extname(file).toLowerCase()] ?? 'application/octet-stream'
  res.statusCode = 200
  res.setHeader('content-type', type)
  if (method === 'HEAD') {
    res.end()
    return
  }
  createReadStream(file).pipe(res)
}

ensureDist()

const server = createServer((req, res) => {
  const method = req.method ?? 'GET'
  const path = (req.url ?? '/').split('?')[0] ?? '/'

  if (path === '/health' || path === '/healthz') {
    sendJson(res, 200, { ok: true })
    return
  }

  if (path.startsWith('/api')) {
    void pipeHonoToNode(app, req, res).catch((error: unknown) => {
      console.error(error)
      if (!res.headersSent) {
        sendJson(res, 500, { error: 'Something went wrong.' })
      }
    })
    return
  }

  if (method !== 'GET' && method !== 'HEAD') {
    res.statusCode = 405
    res.end()
    return
  }

  const file = safeFile(path === '/' ? '/index.html' : path) ?? join(DIST, 'index.html')
  sendFile(res, file, method)
})

server.listen(PORT, HOST, () => {
  console.log(`Nursery Desk listening on http://${HOST}:${PORT}`)
})
