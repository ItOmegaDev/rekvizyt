import { randomBytes } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { z } from 'zod'

// .env лежить у корені проєкту, а сервер запускається з server/.
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })
// Локальний server/.env має пріоритет, якщо існує.
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true })

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(4000),
  DATA_DIR: z.string().trim().default('.data'),
  // Google Identity Services: тільки Client ID, секрет не потрібен (ID-токен).
  GOOGLE_CLIENT_ID: z.preprocess((v) => (v === '' ? undefined : v), z.string().min(1).optional()),
  // Кому дозволено входити: «me@gmail.com,partner@gmail.com».
  ALLOWED_EMAILS: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    ),
  SESSION_SECRET: z.preprocess((v) => (v === '' ? undefined : v), z.string().min(32).optional()),
  // Локальний вхід без Google - ЛИШЕ для розробки, явно вмикається.
  DEV_LOGIN: z.enum(['0', '1']).default('0'),
  CLIENT_ORIGIN: z
    .string()
    .default('http://localhost:5173')
    .transform((value) =>
      value
        .split(',')
        .map((item) => item.trim().replace(/\/+$/, ''))
        .filter(Boolean),
    )
    .pipe(z.array(z.string().url()).min(1)),
  SERVE_CLIENT: z.enum(['0', '1']).default('1'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Некоректні змінні оточення:')
  for (const issue of parsed.error.issues) {
    console.error(`   ${issue.path.join('.')}: ${issue.message}`)
  }
  process.exit(1)
}

const env = parsed.data
const isProduction = env.NODE_ENV === 'production'

let sessionSecret = env.SESSION_SECRET
if (!sessionSecret) {
  if (isProduction) {
    console.error('❌ SESSION_SECRET обов’язковий у production (мінімум 32 символи).')
    process.exit(1)
  }
  // У dev сесії скидаються при перезапуску - це прийнятно й безпечно.
  sessionSecret = randomBytes(32).toString('base64url')
  console.warn('⚠️  SESSION_SECRET не задано - згенеровано тимчасовий (сесії скинуться при перезапуску).')
}

if (isProduction) {
  const problems: string[] = []
  if (!env.GOOGLE_CLIENT_ID) problems.push('GOOGLE_CLIENT_ID не задано - вхід неможливий')
  if (env.ALLOWED_EMAILS.length === 0) problems.push('ALLOWED_EMAILS порожній - нікому не можна входити')
  if (env.DEV_LOGIN === '1') problems.push('DEV_LOGIN=1 заборонено у production')
  if (problems.length > 0) {
    console.error('❌ Некоректні production-налаштування:')
    for (const problem of problems) console.error(`   ${problem}`)
    process.exit(1)
  }
}

if (!isProduction && env.GOOGLE_CLIENT_ID && env.ALLOWED_EMAILS.length === 0) {
  console.warn('⚠️  ALLOWED_EMAILS порожній - Google-вхід відхилить будь-кого.')
}

const allowedOrigins = Array.from(new Set(env.CLIENT_ORIGIN))

export const config = {
  ...env,
  isProduction,
  sessionSecret,
  allowedEmails: env.ALLOWED_EMAILS,
  allowedOrigins,
  serveClient: env.SERVE_CLIENT === '1',
  devLogin: !isProduction && env.DEV_LOGIN === '1',
  dataDir: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..', env.DATA_DIR),
} as const
