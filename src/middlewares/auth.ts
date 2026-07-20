import { NextFunction, Request, Response } from 'express';
import jwt, { TokenExpiredError } from 'jsonwebtoken';
import { AccountStatus } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../db/prisma';
import { HttpError, ErrorCodes } from '../utils/httpError';

type JwtPayload = { sub: string; userId?: string; companyId: string; email: string; ruolo?: string; permessi?: string[] };

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.header('authorization') || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) throw new HttpError(401, 'Token mancante', undefined, ErrorCodes.UNAUTHORIZED);

    const payload = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE
    }) as JwtPayload;

    const account = await prisma.account.findUnique({ where: { id: payload.sub } });
    if (!account || account.companyId !== payload.companyId || account.stato !== AccountStatus.ATTIVO || account.dataScadenza < new Date()) {
      throw new HttpError(401, 'Account non autorizzato', undefined, ErrorCodes.UNAUTHORIZED);
    }

    req.auth = {
      userId: account.id,
      accountId: account.id,
      companyId: account.companyId,
      email: account.email,
      ruolo: payload.ruolo ?? 'USER',
      permessi: Array.isArray(payload.permessi) ? payload.permessi : []
    };
    next();
  } catch (error) {
    if (error instanceof HttpError) return next(error);
    if (error instanceof TokenExpiredError) return next(new HttpError(401, 'La sessione è scaduta', undefined, ErrorCodes.TOKEN_EXPIRED));
    return next(new HttpError(401, 'Token non valido', undefined, ErrorCodes.TOKEN_INVALID));
  }
}

export function companyIdFrom(req: Request): string {
  if (!req.auth?.companyId) throw new HttpError(401, 'Account non autenticato', undefined, ErrorCodes.UNAUTHORIZED);
  return req.auth.companyId;
}
