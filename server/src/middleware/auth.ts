import type { NextFunction, Request, Response } from 'express'
import { config } from '../config.js'
import { HttpError } from '../lib/http-error.js'
import { SESSION_COOKIE, verifySession, type SessionPayload } from '../lib/session.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      session?: SessionPayload
    }
  }
}

/** Чи дозволено цьому email входити. Порожній список у production недосяжний. */
export function isAllowedEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase()
  if (config.allowedEmails.length === 0) {
    // Лише dev-режим: без списку пускаємо тільки синтетичний локальний акаунт.
    return config.devLogin && normalized === 'dev@localhost'
  }
  return config.allowedEmails.includes(normalized)
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = (req.cookies as Record<string, string | undefined>)[SESSION_COOKIE]
    const session = verifySession(token, config.sessionSecret)
    if (!session || !isAllowedEmail(session.email)) {
      throw HttpError.unauthorized()
    }
    req.session = session
    next()
  } catch (err) {
    next(err)
  }
}
