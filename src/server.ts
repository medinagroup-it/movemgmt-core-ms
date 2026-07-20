import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './db/prisma';
import { logger } from './logging/logger';
import { cleanupTempStorage, initializeStorage } from './storage/storage.service';
import { pdfGenerator } from './contracts/pdf/pdf.generator';

async function main() {
  await initializeStorage();
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info({ env: env.NODE_ENV, port: env.PORT, swaggerEnabled: env.SWAGGER_ENABLED }, 'MoveMGMT Core MS started');
  });

  server.requestTimeout = env.REQUEST_TIMEOUT_MS;
  server.headersTimeout = env.REQUEST_TIMEOUT_MS + 5000;

  let shuttingDown = false;
  async function shutdown(signal: string, exitCode = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutdown started');
    const timeout = setTimeout(() => {
      logger.error({ signal }, 'Shutdown timeout reached');
      process.exit(1);
    }, env.SHUTDOWN_TIMEOUT_MS);

    server.close(async () => {
      try {
        await Promise.allSettled([pdfGenerator.destroy(), prisma.$disconnect(), cleanupTempStorage()]);
        clearTimeout(timeout);
        logger.info({ signal }, 'Shutdown completed');
        process.exit(exitCode);
      } catch (error) {
        clearTimeout(timeout);
        logger.error({ err: error }, 'Shutdown failed');
        process.exit(1);
      }
    });
  }

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ err: reason }, 'Unhandled rejection');
    void shutdown('unhandledRejection', 1);
  });
  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught exception');
    void shutdown('uncaughtException', 1);
  });
}

void main().catch((error) => {
  logger.fatal({ err: error }, 'Startup failed');
  process.exit(1);
});
