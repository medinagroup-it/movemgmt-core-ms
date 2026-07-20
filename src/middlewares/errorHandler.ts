import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '../logging/logger';
import { HttpError } from '../utils/httpError';
import { ErrorCodes } from '../utils/errorCodes';

function mapPrismaError(error: Prisma.PrismaClientKnownRequestError): { status: number; code: string; message: string } {
  if (error.code === 'P2002') return { status: 409, code: ErrorCodes.RESOURCE_CONFLICT, message: 'Risorsa già esistente' };
  if (error.code === 'P2025') return { status: 404, code: ErrorCodes.RESOURCE_NOT_FOUND, message: 'Risorsa non trovata' };
  return { status: 500, code: ErrorCodes.INTERNAL_ERROR, message: 'Errore interno' };
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const requestId = req.requestId ?? res.getHeader('X-Request-Id')?.toString() ?? 'unknown';

  if (err instanceof ZodError) {
    return res.status(400).json({
      code: ErrorCodes.VALIDATION_ERROR,
      message: 'Errore di validazione',
      requestId,
      details: err.issues.map((issue) => ({ path: issue.path, message: issue.message, code: issue.code }))
    });
  }


  if (err instanceof Error && err.message === 'CORS origin non autorizzata') {
    return res.status(403).json({ code: ErrorCodes.FORBIDDEN, message: 'Origine non autorizzata', requestId, details: [] });
  }

  if (err instanceof HttpError) {
    if (err.statusCode >= 500) logger.error({ err, requestId, userId: req.auth?.userId, companyId: req.auth?.companyId }, err.message);
    return res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
      requestId,
      ...(err.details ? { details: err.details } : {})
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = mapPrismaError(err);
    logger.error({ err, requestId, userId: req.auth?.userId, companyId: req.auth?.companyId, prismaCode: err.code }, mapped.message);
    return res.status(mapped.status).json({ code: mapped.code, message: mapped.message, requestId, details: [] });
  }

  logger.error({ err, requestId, userId: req.auth?.userId, companyId: req.auth?.companyId }, 'Unhandled application error');
  return res.status(500).json({ code: ErrorCodes.INTERNAL_ERROR, message: 'Errore interno', requestId, details: [] });
};
