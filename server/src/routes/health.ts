import { Router, type Request, type Response } from 'express'
import { AUTHOR, type HealthResponse } from '@rekvizyt/shared'
import { dbState } from '../db.js'

export const healthRouter: Router = Router()

healthRouter.get('/health', (_req: Request, res: Response<HealthResponse>) => {
  res.setHeader('Cache-Control', 'no-store')
  res.json({
    status: 'ok',
    uptimeSeconds: Math.floor(process.uptime()),
    db: dbState(),
    author: AUTHOR.name,
  })
})
