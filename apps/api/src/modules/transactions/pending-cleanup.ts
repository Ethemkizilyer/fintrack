import { prisma } from '@/lib/prisma';

const STALE_PENDING_AGE_MS = 60_000;

export async function cleanupStalePendingTransactions(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - STALE_PENDING_AGE_MS);

  const result = await prisma.transaction.updateMany({
    where: {
      status: 'PENDING',
      createdAt: { lt: cutoff },
    },
    data: {
      status: 'FAILED',
      failureReason: 'STALE_PENDING',
    },
  });

  return result.count;
}
