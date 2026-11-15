import { Router, type Request, type Response } from 'express'
import {
  contractInputSchema,
  counterpartyInputSchema,
  type Contract,
  type Counterparty,
  type CounterpartyListResponse,
  type CounterpartyWithContracts,
  type OkResponse,
} from '@rekvizyt/shared'
import { asyncHandler } from '../lib/async-handler.js'
import { HttpError } from '../lib/http-error.js'
import { parseBody, parseId } from '../lib/validate.js'
import { requireAuth } from '../middleware/auth.js'
import {
  createContract,
  createCounterparty,
  deleteContract,
  deleteCounterparty,
  getContract,
  getCounterpartyWithContracts,
  listCounterparties,
  updateContract,
  updateCounterparty,
} from '../repo/counterparties.js'

export const counterpartiesRouter: Router = Router()

counterpartiesRouter.get(
  '/counterparties',
  requireAuth,
  (req: Request, res: Response<CounterpartyListResponse>) => {
    const includeInactive = req.query.all === '1'
    res.json({ items: listCounterparties(includeInactive) })
  },
)

counterpartiesRouter.get(
  '/counterparties/:id',
  requireAuth,
  (req: Request, res: Response<CounterpartyWithContracts>) => {
    const item = getCounterpartyWithContracts(parseId(String(req.params.id), 'counterpartyId'))
    if (!item) throw HttpError.notFound('Замовника не знайдено')
    res.json(item)
  },
)

counterpartiesRouter.post(
  '/counterparties',
  requireAuth,
  asyncHandler(async (req: Request, res: Response<Counterparty>) => {
    const input = parseBody(counterpartyInputSchema, req)
    res.status(201).json(createCounterparty(input))
  }),
)

counterpartiesRouter.put(
  '/counterparties/:id',
  requireAuth,
  asyncHandler(async (req: Request, res: Response<Counterparty>) => {
    const id = parseId(String(req.params.id), 'counterpartyId')
    const input = parseBody(counterpartyInputSchema, req)
    const updated = updateCounterparty(id, input)
    if (!updated) throw HttpError.notFound('Замовника не знайдено')
    res.json(updated)
  }),
)

counterpartiesRouter.delete(
  '/counterparties/:id',
  requireAuth,
  asyncHandler(async (req: Request, res: Response<OkResponse>) => {
    const id = parseId(String(req.params.id), 'counterpartyId')
    const result = deleteCounterparty(id)
    if (result === 'not_found') throw HttpError.notFound('Замовника не знайдено')
    res.json({ ok: true, deactivated: result === 'deactivated' })
  }),
)

/* ─────────────────────────────── Договори ─────────────────────────────── */

counterpartiesRouter.post(
  '/counterparties/:id/contracts',
  requireAuth,
  asyncHandler(async (req: Request, res: Response<Contract>) => {
    const counterpartyId = parseId(String(req.params.id), 'counterpartyId')
    const input = parseBody(contractInputSchema, req)
    const contract = createContract(counterpartyId, input)
    if (!contract) throw HttpError.notFound('Замовника не знайдено')
    res.status(201).json(contract)
  }),
)

counterpartiesRouter.put(
  '/contracts/:id',
  requireAuth,
  asyncHandler(async (req: Request, res: Response<Contract>) => {
    const id = parseId(String(req.params.id), 'contractId')
    const input = parseBody(contractInputSchema, req)
    const updated = updateContract(id, input)
    if (!updated) throw HttpError.notFound('Договір не знайдено')
    res.json(updated)
  }),
)

counterpartiesRouter.delete(
  '/contracts/:id',
  requireAuth,
  asyncHandler(async (req: Request, res: Response<OkResponse>) => {
    const id = parseId(String(req.params.id), 'contractId')
    const result = deleteContract(id)
    if (result === 'not_found') throw HttpError.notFound('Договір не знайдено')
    res.json({ ok: true, deactivated: result === 'deactivated' })
  }),
)

counterpartiesRouter.get(
  '/contracts/:id',
  requireAuth,
  (req: Request, res: Response<Contract>) => {
    const contract = getContract(parseId(String(req.params.id), 'contractId'))
    if (!contract) throw HttpError.notFound('Договір не знайдено')
    res.json(contract)
  },
)
