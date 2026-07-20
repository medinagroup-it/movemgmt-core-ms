import { ErrorCodes, type ErrorCode } from './errorCodes';

export class HttpError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.code = code ?? statusToCode(statusCode);
  }
}

export function statusToCode(statusCode: number): string {
  if (statusCode === 400 || statusCode === 422) return ErrorCodes.VALIDATION_ERROR;
  if (statusCode === 401) return ErrorCodes.UNAUTHORIZED;
  if (statusCode === 403) return ErrorCodes.FORBIDDEN;
  if (statusCode === 404) return ErrorCodes.RESOURCE_NOT_FOUND;
  if (statusCode === 409) return ErrorCodes.RESOURCE_CONFLICT;
  if (statusCode === 429) return ErrorCodes.RATE_LIMIT_EXCEEDED;
  if (statusCode === 503) return ErrorCodes.SERVICE_UNAVAILABLE;
  return ErrorCodes.INTERNAL_ERROR;
}

export { ErrorCodes };
export type { ErrorCode };
