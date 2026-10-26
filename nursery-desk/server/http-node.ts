import type { IncomingMessage, ServerResponse } from 'node:http'

type FetchApp = { fetch: (request: Request) => Response | Promise<Response> }

const SKIP_HEADERS = new Set([
  'connection',
  'content-length',
  'host',
  'keep-alive',
  'transfer-encoding',
])

export function readBody(req: IncomingMessage) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(chunk as Buffer))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export async function pipeHonoToNode(app: FetchApp, req: IncomingMessage, res: ServerResponse) {
  const host = req.headers.host ?? 'localhost'
  const url = `http://${host}${req.url ?? '/'}`
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value || SKIP_HEADERS.has(key.toLowerCase())) continue
    headers.set(key, Array.isArray(value) ? value.join(', ') : value)
  }

  const method = req.method ?? 'GET'
  const raw = method === 'GET' || method === 'HEAD' ? undefined : new Uint8Array(await readBody(req))
  const init: RequestInit & { duplex?: 'half' } = { method, headers }
  if (raw && raw.byteLength > 0) {
    init.body = raw
    init.duplex = 'half'
  }
  const request = new Request(url, init)
  const response = await app.fetch(request)
  res.statusCode = response.status
  response.headers.forEach((value, key) => {
    res.setHeader(key, value)
  })
  res.end(Buffer.from(await response.arrayBuffer()))
}
