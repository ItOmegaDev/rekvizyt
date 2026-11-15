import type { Request } from 'express'
import type { z } from 'zod'
import { HttpError } from './http-error.js'

function firstIssueMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Некоректні дані'
}

export function parseBody<S extends z.ZodTypeAny>(schema: S, req: Request): z.infer<S> {
  const result = schema.safeParse(req.body)
  if (!result.success) throw HttpError.badRequest(firstIssueMessage(result.error))
  return result.data
}

export function parseQuery<S extends z.ZodTypeAny>(schema: S, req: Request): z.infer<S> {
  const result = schema.safeParse(req.query)
  if (!result.success) throw HttpError.badRequest(firstIssueMessage(result.error))
  return result.data
}

/** Ідентифікатори - UUID v4, жодних SQL-рядків із параметрів напряму. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function parseId(value: string, label = 'id'): string {
  if (!UUID.test(value)) throw HttpError.badRequest(`Некоректний ${label}`)
  return value
}
