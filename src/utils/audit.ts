import { Request } from 'express';

export function actorFrom(req: Request, fallback?: string): string {
  return req.auth?.email || req.auth?.accountId || fallback || 'system';
}

export function updaterFrom(req: Request): string {
  return req.auth?.email || req.auth?.accountId || 'system';
}
