import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const ROOT = resolve('uploads')

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])

export function assertContentType(value: string) {
  if (!ALLOWED.has(value)) {
    throw new Error('Upload a PDF, JPG, PNG or WebP file.')
  }
}

export async function saveUpload(relativePath: string, bytes: Buffer) {
  const full = resolve(ROOT, relativePath)
  if (!full.startsWith(ROOT)) {
    throw new Error('Invalid upload path.')
  }
  await mkdir(dirname(full), { recursive: true })
  await writeFile(full, bytes)
  return relativePath.replaceAll('\\', '/')
}

export async function readUpload(relativePath: string) {
  const full = resolve(ROOT, relativePath)
  if (!full.startsWith(ROOT)) {
    throw new Error('Invalid upload path.')
  }
  return readFile(full)
}

export function decodeBase64File(data: string, contentType: string) {
  assertContentType(contentType)
  const raw = data.includes(',') ? data.slice(data.indexOf(',') + 1) : data
  const bytes = Buffer.from(raw, 'base64')
  if (bytes.length === 0) {
    throw new Error('The file is empty.')
  }
  if (bytes.length > 2 * 1024 * 1024) {
    throw new Error('Each file must be under 2 MB.')
  }
  return bytes
}
