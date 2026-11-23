import { createServer } from 'node:http';
import { app } from '@/app';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { cleanupStalePendingTransactions } from '@/modules/transactions/pending-cleanup';

const SHUTDOWN_TIMEOUT_MS = 10_000;
const PENDING_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

const server = createServer(app);

let shutdownStarted = false;
let pendingCleanupTimer: NodeJS.Timeout | undefined;
let pendingCleanupTask: Promise<void> | null = null;

function runPendingCleanup(): Promise<void> {
  if (pendingCleanupTask) return pendingCleanupTask;

  const task = cleanupStalePendingTransactions()
    .then((count) => {
      if (count > 0) {
        logger.info({ count }, 'Stale pending transactions marked as failed');
      }
    })
    .catch((error: unknown) => {
      logger.error({ err: error }, 'Failed to clean up stale pending transactions');
    })
    .finally(() => {
      pendingCleanupTask = null;
    });

  pendingCleanupTask = task;
  return task;
}

function shutdown(signal: NodeJS.Signals): void {
  if (pendingCleanupTimer) {
    clearInterval(pendingCleanupTimer);
    pendingCleanupTimer = undefined;
  }

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

    void (async () => {
      if (pendingCleanupTask) {
        await pendingCleanupTask;
      }

      await prisma.$disconnect();
      logger.info('Prisma disconnected');
    })().catch((shutdownError: unknown) => {
      logger.error({ err: shutdownError }, 'Failed to finish shutdown');
      process.exitCode = 1;
    });
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

server.listen(env.PORT, () => {
  logger.info(`Server is running on port ${env.PORT}`);

  void runPendingCleanup();

  pendingCleanupTimer = setInterval(() => {
    void runPendingCleanup();
  }, PENDING_CLEANUP_INTERVAL_MS);

  pendingCleanupTimer.unref();
});
