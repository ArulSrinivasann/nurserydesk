import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'

const ALPHABET = 'ACDEFGHJKLMNPQRTUVWXY34679'
const LENGTH = 5
const TTL_MS = 5 * 60 * 1000

const used = new Map<string, number>()

function secret() {
  const value = process.env.SESSION_SECRET
  if (!value) {
    throw new Error('SESSION_SECRET is missing.')
  }
  return value
}

function pruneUsed(now = Date.now()) {
  for (const [token, exp] of used) {
    if (exp <= now) used.delete(token)
  }
}

function normalize(value: string) {
  return value.trim().toUpperCase().replaceAll(' ', '')
}

function sign(answer: string, nonce: string, exp: number) {
  return createHmac('sha256', secret()).update(`${answer}:${exp}:${nonce}`).digest('base64url')
}

function equal(left: string, right: string) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

function randomAnswer() {
  const bytes = randomBytes(LENGTH)
  let answer = ''
  for (const byte of bytes) {
    answer += ALPHABET[byte % ALPHABET.length]
  }
  return answer
}

function renderCaptchaSvg(answer: string) {
  const letters = [...answer].map((ch, index) => {
    const x = 28 + index * 38
    const y = 42 + randomInt(0, 7) - 3
    const rotate = randomInt(0, 17) - 8
    const fill = index % 2 === 0 ? '#3a3128' : '#5c4634'
    return `<text x="${x}" y="${y}" transform="rotate(${rotate} ${x} ${y})" fill="${fill}" font-family="ui-sans-serif, system-ui, sans-serif" font-size="28" font-weight="800">${ch}</text>`
  })
  const lines = Array.from({ length: 6 }, () => {
    const x1 = randomInt(8, 80)
    const y1 = randomInt(8, 56)
    const x2 = randomInt(120, 212)
    const y2 = randomInt(8, 56)
    const stroke = randomInt(0, 2) === 0 ? '#d49e72' : '#c4b49a'
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="1.4" stroke-linecap="round" opacity="0.55"/>`
  })
  const dots = Array.from({ length: 18 }, () => {
    const cx = randomInt(10, 210)
    const cy = randomInt(8, 56)
    return `<circle cx="${cx}" cy="${cy}" r="1.2" fill="#b06a2e" opacity="0.35"/>`
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="64" viewBox="0 0 220 64" preserveAspectRatio="xMidYMid meet" role="img" aria-hidden="true"><rect width="220" height="64" fill="#f8f4ec"/>${lines.join('')}${dots.join('')}${letters.join('')}</svg>`
}

export function createCaptcha() {
  const answer = randomAnswer()
  const nonce = randomBytes(16).toString('base64url')
  const exp = Date.now() + TTL_MS
  const svg = renderCaptchaSvg(answer)
  return {
    answer,
    token: `${exp}.${nonce}.${sign(answer, nonce, exp)}`,
    image: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
  }
}

export function verifyCaptcha(token: string, input: string) {
  pruneUsed()
  const [expValue, nonce, mac] = token.split('.')
  const exp = Number(expValue)
  const answer = normalize(input)
  if (!expValue || !nonce || !mac || !Number.isFinite(exp) || answer.length !== LENGTH) {
    return false
  }
  if (Date.now() > exp || exp > Date.now() + TTL_MS + 1000) {
    return false
  }
  if (used.has(token)) {
    return false
  }
  used.set(token, exp)
  return equal(mac, sign(answer, nonce, exp))
}

