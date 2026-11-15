import type { NextFunction, Request, RequestHandler, Response } from 'express'

/** Обгортка для async-хендлерів: помилки йдуть у централізований обробник. */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next)
  }
}
