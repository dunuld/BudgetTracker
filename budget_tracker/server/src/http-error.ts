import type { ApiError } from '../../shared/api-types.js';

/** Fehler mit HTTP-Status; Meldung wird dem Client angezeigt (deutsch). */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code?: string,
    readonly details: Partial<Pick<ApiError, 'existing'>> = {},
  ) {
    super(message);
    this.name = 'HttpError';
  }

  toBody(): ApiError {
    return { error: this.message, ...(this.code ? { code: this.code } : {}), ...this.details };
  }
}

export const badRequest = (message: string, code = 'BAD_REQUEST') =>
  new HttpError(400, message, code);
export const notFound = (message = 'Nicht gefunden') => new HttpError(404, message, 'NOT_FOUND');
