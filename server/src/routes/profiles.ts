import { Router, type Request, type Response } from 'express'
import { profileInputSchema, type OkResponse, type Profile, type ProfileListResponse } from '@rekvizyt/shared'
import { asyncHandler } from '../lib/async-handler.js'
import { HttpError } from '../lib/http-error.js'
import { parseBody, parseId } from '../lib/validate.js'
import { requireAuth } from '../middleware/auth.js'
import {
  createProfile,
  deleteProfile,
  getProfile,
  listProfiles,
  updateProfile,
} from '../repo/profiles.js'

export const profilesRouter: Router = Router()

profilesRouter.get(
  '/profiles',
  requireAuth,
  (req: Request, res: Response<ProfileListResponse>) => {
    const includeInactive = req.query.all === '1'
    res.json({ items: listProfiles(includeInactive) })
  },
)

profilesRouter.post(
  '/profiles',
  requireAuth,
  asyncHandler(async (req: Request, res: Response<Profile>) => {
    const input = parseBody(profileInputSchema, req)
    res.status(201).json(createProfile(input))
  }),
)

profilesRouter.put(
  '/profiles/:id',
  requireAuth,
  asyncHandler(async (req: Request, res: Response<Profile>) => {
    const id = parseId(String(req.params.id), 'profileId')
    const input = parseBody(profileInputSchema, req)
    const updated = updateProfile(id, input)
    if (!updated) throw HttpError.notFound('Реквізити не знайдено')
    res.json(updated)
  }),
)

profilesRouter.delete(
  '/profiles/:id',
  requireAuth,
  asyncHandler(async (req: Request, res: Response<OkResponse>) => {
    const id = parseId(String(req.params.id), 'profileId')
    const result = deleteProfile(id)
    if (result === 'not_found') throw HttpError.notFound('Реквізити не знайдено')
    res.json({ ok: true, deactivated: result === 'deactivated' })
  }),
)

profilesRouter.get(
  '/profiles/:id',
  requireAuth,
  (req: Request, res: Response<Profile>) => {
    const profile = getProfile(parseId(String(req.params.id), 'profileId'))
    if (!profile) throw HttpError.notFound('Реквізити не знайдено')
    res.json(profile)
  },
)
