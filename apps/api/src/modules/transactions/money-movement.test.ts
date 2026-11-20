import { randomUUID } from 'node:crypto';
import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { createAccount, createCustomer } from '../../../tests/helpers';
import { runMoneyTransaction } from './money-movement';
import { describe, expect, it } from 'vitest';

describe('runMoneyTransaction', () => {
  it('updates the balance and appends a credit ledger entry', async () => {
    const { user, customer } = await createCustomer();
    const account = await createAccount(customer.id);

    const pending = await prisma.transaction.create({
      data: {
        type: 'DEPOSIT',
        status: 'PENDING',
        amount: new Prisma.Decimal('25.00'),
        currency: 'TRY',
        targetAccountId: account.id,
        idempotencyKey: randomUUID(),
        requestHash: randomUUID(),
        initiatedById: user.id,
      },
    });

    const completed = await runMoneyTransaction(pending, [
      {
        accountId: account.id,
        direction: 'CREDIT',
        amount: new Prisma.Decimal('25.00'),
      },
    ]);

    const updatedAccount = await prisma.account.findUniqueOrThrow({
      where: { id: account.id },
    });
    const ledgerEntries = await prisma.ledgerEntry.findMany({
      where: { transactionId: pending.id },
    });

    expect(completed.status).toBe('COMPLETED');
    expect(updatedAccount.balance.toFixed(2)).toBe('25.00');
    expect(ledgerEntries).toHaveLength(1);
    expect(ledgerEntries[0]?.direction).toBe('CREDIT');
    expect(ledgerEntries[0]?.balanceAfter.toFixed(2)).toBe('25.00');
  });

  it('rolls back an insufficient withdrawal and records the failure', async () => {
    const { user, customer } = await createCustomer();
    const account = await createAccount(customer.id);

    const pending = await prisma.transaction.create({
      data: {
        type: 'WITHDRAWAL',
        status: 'PENDING',
        amount: new Prisma.Decimal('10.00'),
        currency: 'TRY',
        sourceAccountId: account.id,
        idempotencyKey: randomUUID(),
        requestHash: randomUUID(),
        initiatedById: user.id,
      },
    });

    await expect(
      runMoneyTransaction(pending, [
        {
          accountId: account.id,
          direction: 'DEBIT',
          amount: new Prisma.Decimal('10.00'),
        },
      ]),
    ).rejects.toMatchObject({
      code: 'INSUFFICIENT_FUNDS',
      details: { referenceNo: pending.referenceNo },
    });

    const updatedAccount = await prisma.account.findUniqueOrThrow({
      where: { id: account.id },
    });
    const failedTransaction = await prisma.transaction.findUniqueOrThrow({
      where: { id: pending.id },
    });
    const ledgerCount = await prisma.ledgerEntry.count({
      where: { transactionId: pending.id },
    });

    expect(updatedAccount.balance.toFixed(2)).toBe('0.00');
    expect(failedTransaction.status).toBe('FAILED');
    expect(failedTransaction.failureReason).toBe('INSUFFICIENT_FUNDS');
    expect(ledgerCount).toBe(0);
  });
});
