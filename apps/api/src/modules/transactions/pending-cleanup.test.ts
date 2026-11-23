import { randomUUID } from 'node:crypto';
import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { createAccount, createCustomer } from '../../../tests/helpers';
import { describe, expect, it } from 'vitest';
import { cleanupStalePendingTransactions } from './pending-cleanup';

async function createPendingDeposit(accountId: string, initiatedById: string, createdAt: Date) {
  return prisma.transaction.create({
    data: {
      type: 'DEPOSIT',
      status: 'PENDING',
      amount: new Prisma.Decimal('5.00'),
      currency: 'TRY',
      targetAccountId: accountId,
      idempotencyKey: randomUUID(),
      requestHash: randomUUID(),
      initiatedById,
      createdAt,
    },
  });
}

describe('cleanupStalePendingTransactions', () => {
  it('fails only pending transactions older than one minute without touching balances or ledger', async () => {
    const { user, customer } = await createCustomer();
    const account = await createAccount(customer.id);
    const now = new Date();

    const staleTransaction = await createPendingDeposit(
      account.id,
      user.id,
      new Date(now.getTime() - 60_001),
    );
    const freshTransaction = await createPendingDeposit(
      account.id,
      user.id,
      new Date(now.getTime() - 59_000),
    );

    const updatedCount = await cleanupStalePendingTransactions(now);

    const [staleAfterCleanup, freshAfterCleanup, accountAfterCleanup, ledgerCount] =
      await Promise.all([
        prisma.transaction.findUniqueOrThrow({
          where: { id: staleTransaction.id },
        }),
        prisma.transaction.findUniqueOrThrow({
          where: { id: freshTransaction.id },
        }),
        prisma.account.findUniqueOrThrow({
          where: { id: account.id },
        }),
        prisma.ledgerEntry.count({
          where: {
            transactionId: {
              in: [staleTransaction.id, freshTransaction.id],
            },
          },
        }),
      ]);

    expect(updatedCount).toBe(1);
    expect(staleAfterCleanup.status).toBe('FAILED');
    expect(staleAfterCleanup.failureReason).toBe('STALE_PENDING');
    expect(staleAfterCleanup.completedAt).toBeNull();

    expect(freshAfterCleanup.status).toBe('PENDING');
    expect(accountAfterCleanup.balance.toFixed(2)).toBe('0.00');
    expect(ledgerCount).toBe(0);

    expect(await cleanupStalePendingTransactions(now)).toBe(0);
  });
});
