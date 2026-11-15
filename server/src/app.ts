import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express, { type NextFunction, type Request, type Response } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import { config } from './config.js'
import { HttpError } from './lib/http-error.js'
import { authRouter } from './routes/auth.js'
import { counterpartiesRouter } from './routes/counterparties.js'
import { documentsRouter } from './routes/documents.js'
import { healthRouter } from './routes/health.js'
import { profilesRouter } from './routes/profiles.js'

/** Зібраний фронтенд (client/dist) — шлях однаковий для src/ і dist/. */
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist')

export function createApp() {
  const app = express()

  if (config.isProduction) app.set('trust proxy', 1)
  app.disable('x-powered-by')

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          // Google Identity Services: скрипт, iframe і запити до Google.
          'script-src': ["'self'", 'https://accounts.google.com'],
          'connect-src': ["'self'", 'https://accounts.google.com', 'https://www.googleapis.com'],
          'frame-src': ["'self'", 'https://accounts.google.com'],
          'style-src': ["'self'", "'unsafe-inline'", 'https://accounts.google.com'],
          'img-src': ["'self'", 'data:', 'https://*.googleusercontent.com'],
          'form-action': ["'self'", 'https://accounts.google.com'],
        },
      },
      // Вікно вибору Google-акаунта відкривається як popup.
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      crossOriginEmbedderPolicy: false,
    }),
  )
  app.use(cors({ origin: [...config.allowedOrigins], credentials: true }))
  app.use(express.json({ limit: '200kb' }))
  app.use(cookieParser())

  /** Приватні дані не мають осідати в кешах проксі чи браузера. */
  app.use('/api', (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store')
    next()
  })

  // CSRF: для змінювальних запитів Origin мусить бути своїм або дозволеним.
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const method = req.method.toUpperCase()
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      next()
      return
    }
    const origin = req.get('origin')?.replace(/\/+$/, '')
    if (!origin) {
      next()
      return
    }
    const selfOrigin = `${req.protocol}://${req.get('host')}`
    if (origin !== selfOrigin && !config.allowedOrigins.includes(origin)) {
      next(HttpError.forbidden('Недозволений origin'))
      return
    }
    next()
  })

  const apiLimiter = rateLimit({
    windowMs: 60_000,
    limit: 240,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Забагато запитів, спробуйте пізніше' },
  })

  // Вхід: окремий жорсткий ліміт, щоб не перебирали токени/акаунти.
  const loginLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Забагато спроб входу, спробуйте пізніше' },
  })

  app.use('/api', apiLimiter)
  app.use('/api/auth/google', loginLimiter)
  app.use('/api/auth/dev-login', loginLimiter)

  app.use('/api', healthRouter)
  app.use('/api', authRouter)
  app.use('/api', profilesRouter)
  app.use('/api', counterpartiesRouter)
  app.use('/api', documentsRouter)

  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Не знайдено' })
  })

  if (config.serveClient && existsSync(path.join(clientDist, 'index.html'))) {
    app.use(
      express.static(clientDist, {
        index: false,
        setHeaders: (res, filePath) => {
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
          } else if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache')
          }
        },
      }),
    )

    app.get('*', (_req: Request, res: Response) => {
      res.setHeader('Cache-Control', 'no-cache')
      res.sendFile(path.join(clientDist, 'index.html'))
    })
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message })
      return
    }
    console.error('Unhandled error:', err instanceof Error ? err.stack ?? err.message : err)
    res.status(500).json({ error: 'Внутрішня помилка сервера' })
  })

  return app
}
