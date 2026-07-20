import cors, { CorsOptions } from 'cors';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { bookingRouter } from './bookings/booking.routes';
import { clientRouter } from './clients/client.routes';
import { damageRouter } from './damages/damage.routes';
import { errorHandler } from './middlewares/errorHandler';
import { vehicleRouter } from './vehicles/vehicle.routes';
import { setupRouter } from './setup/setup.routes';
import { env } from './config/env';
import { openApiSpec } from './openapi/openapi';
import { authRouter } from './auth/auth.routes';
import { billingDataRouter } from './billing-data/billing-data.routes';
import { fineRouter } from './fines/fine.routes';
import { documentRouter } from './documents/document.routes';
import { contractRouter } from './contracts/contract.routes';
import { requireAuth } from './middlewares/auth';
import { requestIdMiddleware } from './middlewares/requestId';
import { globalRateLimiter, authRateLimiter } from './middlewares/security';
import { logger } from './logging/logger';
import { healthRouter } from './health/health.routes';

function buildCorsOptions(): CorsOptions {
  return {
    origin(origin, callback) {
      if (!origin && !env.isProduction) return callback(null, true);
      if (origin && env.CORS_ORIGIN.includes(origin)) return callback(null, true);
      return callback(new Error('CORS origin non autorizzata'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id'],
    credentials: false,
    maxAge: 86400
  };
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);
  app.use(requestIdMiddleware);
  app.use(pinoHttp({
    logger,
    genReqId: (req: Request) => req.requestId ?? '',
    customProps: (req: Request) => ({ requestId: req.requestId, userId: req.auth?.userId, companyId: req.auth?.companyId }),
    customLogLevel: (_req: Request, res: Response, err?: Error) => err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'
  }));
  app.use(helmet());
  app.use(cors(buildCorsOptions()));
  app.options('*', cors(buildCorsOptions()));
  app.use(express.json({ limit: `${env.MAX_UPLOAD_SIZE_MB}mb` }));
  app.use(express.urlencoded({ extended: true, limit: `${env.MAX_UPLOAD_SIZE_MB}mb` }));
  app.use(globalRateLimiter);

  app.use('/health', healthRouter);
  if (env.SWAGGER_ENABLED) {
    app.get('/openapi.json', (_req, res) => res.json(openApiSpec));
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
  }
  app.use('/auth', authRateLimiter, authRouter);
  app.use('/clients', requireAuth, clientRouter);
  app.use('/vehicles', requireAuth, vehicleRouter);
  app.use('/bookings', requireAuth, bookingRouter);
  app.use('/billing-data', requireAuth, billingDataRouter);
  app.use('/fines', requireAuth, fineRouter);
  app.use('/setup', requireAuth, setupRouter);
  app.use('/documents', requireAuth, documentRouter);
  app.use('/', requireAuth, contractRouter);
  app.use('/', requireAuth, damageRouter);

  app.use(errorHandler);
  return app;
}
