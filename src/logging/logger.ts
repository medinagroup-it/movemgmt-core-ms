import pino from 'pino';
import { env } from '../config/env';

export const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'password',
  '*.password',
  '*.passwordHash',
  'token',
  '*.token',
  'accessToken',
  '*.accessToken',
  'jwt',
  '*.jwt',
  'secret',
  '*.secret',
  'apiKey',
  '*.apiKey',
  'DATABASE_URL',
  '*.DATABASE_URL'
];

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: { paths: redactPaths, censor: '[REDACTED]' },
  transport: env.isDevelopment
    ? { target: 'pino-pretty', options: { colorize: true, singleLine: true, translateTime: 'SYS:standard' } }
    : undefined
});
