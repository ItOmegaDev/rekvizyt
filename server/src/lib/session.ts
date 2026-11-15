import { createHmac, timingSafeEqual } from 'node:crypto'

export interface SessionPayload {
  sub: string
  email: string
  /** Unix-час закінчення, секунди */
  exp: number
}

const MAX_AGE_SECONDS = 8 * 60 * 60

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url')
}

function signRaw(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url')
}

export function createSession(email: string, secret: string, nowMs = Date.now()): string {
  const payload: SessionPayload = {
    sub: email,
    email,
    exp: Math.floor(nowMs / 1000) + MAX_AGE_SECONDS,
  }
  const body = b64url(JSON.stringify(payload))
  return `${body}.${signRaw(body, secret)}`
}

/** Постійне за часом порівняння підпису. */
export function verifySession(
  token: string | undefined,
  secret: string,
  nowMs = Date.now(),
): SessionPayload | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [body, signature] = parts as [string, string]

  const expected = signRaw(body, secret)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  let payload: SessionPayload
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload
  } catch {
    return null
  }

  if (typeof payload?.exp !== 'number' || payload.exp * 1000 <= nowMs) return null
  if (typeof payload.email !== 'string' || payload.email === '') return null

  return payload
}

export const SESSION_COOKIE = 'rekvizyt_sid'
export const SESSION_MAX_AGE_SECONDS = MAX_AGE_SECONDS
