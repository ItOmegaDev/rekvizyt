import { Router, type Request, type Response } from 'express'
import { OAuth2Client } from 'google-auth-library'
import { googleLoginSchema, type PublicConfig, type SessionUser } from '@rekvizyt/shared'
import { config } from '../config.js'
import { asyncHandler } from '../lib/async-handler.js'
import { HttpError } from '../lib/http-error.js'
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSession,
} from '../lib/session.js'
import { parseBody } from '../lib/validate.js'
import { isAllowedEmail, requireAuth } from '../middleware/auth.js'

export const authRouter: Router = Router()

const googleClient = config.GOOGLE_CLIENT_ID ? new OAuth2Client(config.GOOGLE_CLIENT_ID) : null

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: config.isProduction,
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS * 1000,
  }
}

function startSession(res: Response, email: string): SessionUser {
  res.cookie(SESSION_COOKIE, createSession(email, config.sessionSecret), cookieOptions())
  return { email }
}

async function verifyGoogleCredential(credential: string): Promise<string> {
  if (!googleClient || !config.GOOGLE_CLIENT_ID) {
    throw new HttpError(503, 'Вхід через Google не налаштований')
  }

  let payload
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: config.GOOGLE_CLIENT_ID,
    })
    payload = ticket.getPayload()
  } catch (err) {
    console.error(
      'Google verifyIdToken failed:',
      err instanceof Error ? err.stack ?? err.message : JSON.stringify(err),
    )
    throw HttpError.unauthorized('Некоректний Google-токен')
  }

  if (!payload?.email || payload.email_verified !== true) {
    throw HttpError.unauthorized('Email не підтверджено')
  }
  return payload.email.toLowerCase()
}

authRouter.post(
  '/auth/google',
  asyncHandler(async (req: Request, res: Response) => {
    const { credential } = parseBody(googleLoginSchema, req)
    const email = await verifyGoogleCredential(credential)

    if (!isAllowedEmail(email)) {
      console.warn(`Відмовлено у вході: ${email}`)
      throw HttpError.forbidden('Немає доступу до сервісу')
    }

    res.json(startSession(res, email))
  }),
)

/**
 * Локальний вхід без Google. Працює лише коли NODE_ENV != production і
 * DEV_LOGIN=1 (явний прапорець у .env розробника).
 */
authRouter.post(
  '/auth/dev-login',
  asyncHandler(async (_req: Request, res: Response) => {
    if (!config.devLogin) throw HttpError.notFound()
    const email = config.allowedEmails[0] ?? 'dev@localhost'
    res.json(startSession(res, email))
  }),
)

authRouter.post('/auth/logout', (_req: Request, res: Response) => {
  res.clearCookie(SESSION_COOKIE, { ...cookieOptions(), maxAge: undefined })
  res.json({ ok: true })
})

authRouter.get(
  '/auth/me',
  requireAuth,
  (req: Request, res: Response<SessionUser>) => {
    res.setHeader('Cache-Control', 'no-store')
    res.json({ email: req.session!.email })
  },
)

/** Публічний конфіг для сторінки входу. Client ID не є секретом. */
authRouter.get('/config', (_req: Request, res: Response<PublicConfig>) => {
  res.setHeader('Cache-Control', 'no-cache')
  res.json({
    googleClientId: config.GOOGLE_CLIENT_ID ?? '',
    devLogin: config.devLogin,
  })
})
