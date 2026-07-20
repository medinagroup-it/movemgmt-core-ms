import { Router } from 'express';
import { prisma } from '../db/prisma';
import { checkStorageReady } from '../storage/storage.service';
import { env } from '../config/env';
import { logger } from '../logging/logger';

export const healthRouter = Router();

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Health check timeout')), ms);
    promise.then((value) => { clearTimeout(timer); resolve(value); }).catch((error) => { clearTimeout(timer); reject(error); });
  });
}

healthRouter.get('/live', (_req, res) => res.json({ status: 'ok' }));
healthRouter.get('/', (_req, res) => res.json({ status: 'ok' }));

healthRouter.get('/ready', async (_req, res) => {
  try {
    await withTimeout(Promise.all([prisma.$queryRaw`SELECT 1`, checkStorageReady()]), Math.min(env.REQUEST_TIMEOUT_MS, 5000));
    res.json({ status: 'ready' });
  } catch (error) {
    logger.error({ err: error }, 'Readiness check failed');
    res.status(503).json({ status: 'not_ready' });
  }
});
