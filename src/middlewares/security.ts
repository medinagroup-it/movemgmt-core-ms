import type { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { ErrorCodes } from '../utils/errorCodes';

export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => res.status(429).json({
    code: ErrorCodes.RATE_LIMIT_EXCEEDED,
    message: 'Troppe richieste. Riprova più tardi.',
    requestId: req.requestId,
    details: []
  })
});

export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.LOGIN_RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => res.status(429).json({
    code: ErrorCodes.RATE_LIMIT_EXCEEDED,
    message: 'Troppe richieste di autenticazione. Riprova più tardi.',
    requestId: req.requestId,
    details: []
  })
});
