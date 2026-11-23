import { createServer } from 'node:http';
import { app } from '@/app';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

const SHUTDOWN_TIMEOUT_MS = 10_000;
const server = createServer(app);

let shutdownStarted = false;

function shutdown(signal: NodeJS.Signals): void {
  if (shutdownStarted) {
    logger.warn({ signal }, 'Shutdown already in progress; closing active connections');
    server.closeAllConnections();
    return;
  }

  shutdownStarted = true;
  logger.info({ signal }, 'Graceful shutdown started');

  const forceCloseTimer = setTimeout(() => {
    logger.warn(
      { signal, timeoutMs: SHUTDOWN_TIMEOUT_MS },
      'Shutdown timed out; closing active HTTP connections',
    );
    server.closeAllConnections();
  }, SHUTDOWN_TIMEOUT_MS);

  forceCloseTimer.unref();

  server.close((error) => {
    clearTimeout(forceCloseTimer);

    if (error) {
      logger.error({ err: error, signal }, 'HTTP server failed to close cleanly');
      process.exitCode = 1;
    } else {
      logger.info({ signal }, 'HTTP server stopped accepting requests');
    }

    void prisma
      .$disconnect()
      .then(() => {
        logger.info('Prisma disconnected');
      })
      .catch((disconnectError: unknown) => {
        logger.error({ err: disconnectError }, 'Failed to disconnect Prisma');
        process.exitCode = 1;
      });
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

server.listen(env.PORT, () => {
  logger.info(`Server is running on port ${env.PORT}`);
});
