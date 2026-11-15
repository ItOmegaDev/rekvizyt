export class HttpError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'HttpError'
  }

  static badRequest(message = 'Некоректний запит') {
    return new HttpError(400, message)
  }

  static unauthorized(message = 'Потрібен вхід') {
    return new HttpError(401, message)
  }

  static forbidden(message = 'Доступ заборонено') {
    return new HttpError(403, message)
  }

  static notFound(message = 'Не знайдено') {
    return new HttpError(404, message)
  }

  static conflict(message = 'Конфлікт даних') {
    return new HttpError(409, message)
  }

  static tooManyRequests(message = 'Забагато спроб, спробуйте пізніше') {
    return new HttpError(429, message)
  }
}
