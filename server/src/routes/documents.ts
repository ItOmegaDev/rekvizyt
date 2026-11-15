import { Router, type Request, type Response } from 'express'
import {
  buildCustomerPreamble,
  buildExecutorPreamble,
  calcItems,
  calcTotal,
  documentInputSchema,
  documentListQuerySchema,
  documentPaidSchema,
  LIMITS,
  nextNumberQuerySchema,
  todayISO,
  type DocumentDetail,
  type DocumentListResponse,
  type NextNumber,
  type OkResponse,
} from '@rekvizyt/shared'
import { asyncHandler } from '../lib/async-handler.js'
import { HttpError } from '../lib/http-error.js'
import { parseBody, parseId, parseQuery } from '../lib/validate.js'
import { requireAuth } from '../middleware/auth.js'
import { getContract, getCounterparty } from '../repo/counterparties.js'
import { getProfile } from '../repo/profiles.js'
import {
  createDocument,
  deleteDocument,
  duplicateDocument,
  getDocument,
  listDocuments,
  nextDocumentNumber,
  setDocumentPaid,
  updateDocument,
  type DocumentWriteInput,
} from '../repo/documents.js'

export const documentsRouter: Router = Router()

/**
 * Замовник визначається договором, а не клієнтом — це прибирає
 * можливість підставити чужі реквізити в документ.
 */
function resolveRefs(profileId: string, contractId: string, requireActive: boolean) {
  const profile = getProfile(profileId)
  if (!profile) throw HttpError.badRequest('Мої реквізити не знайдено')
  if (requireActive && !profile.isActive) throw HttpError.badRequest('Ці реквізити вимкнено')

  const contract = getContract(contractId)
  if (!contract) throw HttpError.badRequest('Договір не знайдено')
  if (requireActive && !contract.isActive) throw HttpError.badRequest('Цей договір вимкнено')

  const counterparty = getCounterparty(contract.counterpartyId)
  if (!counterparty) throw HttpError.badRequest('Замовника не знайдено')
  if (requireActive && !counterparty.isActive) {
    throw HttpError.badRequest('Замовника вимкнено')
  }

  return { profile, contract, counterparty }
}

function buildItems(raw: ReturnType<typeof documentInputSchema.parse>['items']) {
  const items = calcItems(raw)
  const total = calcTotal(items)
  if (total > LIMITS.maxTotalMinor) throw HttpError.badRequest('Сума документа завелика')
  return { items, total }
}

documentsRouter.get(
  '/documents',
  requireAuth,
  (req: Request, res: Response<DocumentListResponse>) => {
    const query = parseQuery(documentListQuerySchema, req)
    res.json({ items: listDocuments(query.q, query.limit) })
  },
)

documentsRouter.get(
  '/documents/next-number',
  requireAuth,
  (req: Request, res: Response<NextNumber>) => {
    const { date } = parseQuery(nextNumberQuerySchema, req)
    res.json({ number: nextDocumentNumber(date).number })
  },
)

documentsRouter.get(
  '/documents/:id',
  requireAuth,
  (req: Request, res: Response<DocumentDetail>) => {
    const doc = getDocument(parseId(String(req.params.id), 'documentId'))
    if (!doc) throw HttpError.notFound('Документ не знайдено')
    res.json(doc)
  },
)

documentsRouter.post(
  '/documents',
  requireAuth,
  asyncHandler(async (req: Request, res: Response<DocumentDetail>) => {
    const input = parseBody(documentInputSchema, req)
    const refs = resolveRefs(input.profileId, input.contractId, true)
    const { items } = buildItems(input.items)
    const auto = nextDocumentNumber(input.issuedAt)

    const write: DocumentWriteInput = {
      ...refs,
      issuedAt: input.issuedAt,
      number: input.number || auto.number,
      items,
      vatNote: input.vatNote,
      note: input.note,
      customerPreamble: refs.counterparty.preamble || buildCustomerPreamble(refs.counterparty),
      executorPreamble: buildExecutorPreamble(refs.profile),
    }

    res.status(201).json(createDocument(write, auto.seq))
  }),
)

documentsRouter.put(
  '/documents/:id',
  requireAuth,
  asyncHandler(async (req: Request, res: Response<DocumentDetail>) => {
    const id = parseId(String(req.params.id), 'documentId')
    const existing = getDocument(id)
    if (!existing) throw HttpError.notFound('Документ не знайдено')

    const input = parseBody(documentInputSchema, req)
    const refs = resolveRefs(input.profileId, input.contractId, false)
    const { items } = buildItems(input.items)

    const write: DocumentWriteInput = {
      ...refs,
      issuedAt: input.issuedAt,
      number: input.number || existing.number,
      items,
      vatNote: input.vatNote,
      note: input.note,
      customerPreamble: refs.counterparty.preamble || buildCustomerPreamble(refs.counterparty),
      executorPreamble: buildExecutorPreamble(refs.profile),
    }

    const updated = updateDocument(id, write)
    if (!updated) throw HttpError.notFound('Документ не знайдено')
    res.json(updated)
  }),
)

documentsRouter.patch(
  '/documents/:id/paid',
  requireAuth,
  (req: Request, res: Response<DocumentDetail>) => {
    const id = parseId(String(req.params.id), 'documentId')
    const input = parseBody(documentPaidSchema, req)
    const paidAt = input.paid ? (input.paidAt ?? todayISO()) : null
    const updated = setDocumentPaid(id, paidAt)
    if (!updated) throw HttpError.notFound('Документ не знайдено')
    res.json(updated)
  },
)

documentsRouter.post(
  '/documents/:id/duplicate',
  requireAuth,
  asyncHandler(async (req: Request, res: Response<DocumentDetail>) => {
    const id = parseId(String(req.params.id), 'documentId')
    const copy = duplicateDocument(id)
    if (!copy) throw HttpError.notFound('Документ не знайдено')
    res.status(201).json(copy)
  }),
)

documentsRouter.delete(
  '/documents/:id',
  requireAuth,
  (req: Request, res: Response<OkResponse>) => {
    const id = parseId(String(req.params.id), 'documentId')
    if (!deleteDocument(id)) throw HttpError.notFound('Документ не знайдено')
    res.json({ ok: true })
  },
)
