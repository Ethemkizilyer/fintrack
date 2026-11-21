import { Prisma } from '@/generated/prisma/client';
import type { Currency } from '@/generated/prisma/enums';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/utils/app-error';

export type Movement = {
  accountId: string;
  direction: 'DEBIT' | 'CREDIT';
  amount: Prisma.Decimal;
};

type LockedAccountRow = {
  id: string;
  balance: string;
  status: string;
  currency: string;
};

type LockedAccount = {
  id: string;
  balance: Prisma.Decimal;
  status: string;
  currency: string;
};

type PendingTransaction = {
  id: string;
  referenceNo: string;
  currency: Currency;
};

const TRANSACTION_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
  maxWait: 5_000,
  timeout: 10_000,
};

async function lockAccounts(
  tx: Prisma.TransactionClient,
  accountIds: string[],
): Promise<Map<string, LockedAccount>> {
  const uniqueIds = [...new Set(accountIds)];

  await tx.$executeRaw`SET LOCAL lock_timeout = '5s'`;

  const rows = await tx.$queryRaw<LockedAccountRow[]>`
    SELECT
      id::text AS id,
      balance::text AS balance,
      status::text AS status,
      currency::text AS currency
    FROM accounts
    WHERE id = ANY(${uniqueIds}::uuid[])
    ORDER BY id
    FOR UPDATE
  `;

  if (rows.length !== uniqueIds.length) {
    throw AppError.notFound('Account not found');
  }

  return new Map(
    rows.map((row) => [
      row.id,
      {
        id: row.id,
        balance: new Prisma.Decimal(row.balance),
        status: row.status,
        currency: row.currency,
      },
    ]),
  );
}

function assertCanMove(
  account: LockedAccount,
  movement: Movement,
  transactionCurrency: Currency,
): void {
  if (account.status !== 'ACTIVE') {
    throw AppError.businessRule('ACCOUNT_INACTIVE', 'Account is not active');
  }

  if (account.currency !== transactionCurrency) {
    throw AppError.businessRule(
      'CURRENCY_MISMATCH',
      'Account currency does not match transaction currency',
    );
  }

  if (movement.direction === 'DEBIT' && account.balance.lessThan(movement.amount)) {
    throw AppError.businessRule('INSUFFICIENT_FUNDS', 'Insufficient funds');
  }
}

function applyMovement(balance: Prisma.Decimal, movement: Movement): Prisma.Decimal {
  return movement.direction === 'DEBIT'
    ? balance.minus(movement.amount)
    : balance.plus(movement.amount);
}

export async function executeMovements(pending: PendingTransaction, movements: Movement[]) {
  if (movements.length === 0) {
    throw AppError.badRequest('At least one movement is required');
  }

  return prisma.$transaction(async (tx) => {
    const accounts = await lockAccounts(
      tx,
      movements.map((movement) => movement.accountId),
    );

    const ledgerEntries: Prisma.LedgerEntryCreateManyInput[] = [];

    for (const movement of movements) {
      const account = accounts.get(movement.accountId);
      if (!account) {
        throw AppError.notFound('Account not found');
      }

      assertCanMove(account, movement, pending.currency);

      const balanceAfter = applyMovement(account.balance, movement);

      await tx.account.update({
        where: { id: account.id },
        data: { balance: balanceAfter },
      });

      ledgerEntries.push({
        transactionId: pending.id,
        accountId: account.id,
        direction: movement.direction,
        amount: movement.amount,
        balanceAfter,
      });

      // Keep the in-memory balance current if an account has multiple movements.
      accounts.set(account.id, { ...account, balance: balanceAfter });
    }

    await tx.ledgerEntry.createMany({ data: ledgerEntries });

    return tx.transaction.update({
      where: { id: pending.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });
  }, TRANSACTION_OPTIONS);
}

export async function runMoneyTransaction(pending: PendingTransaction, movements: Movement[]) {
  try {
    return await executeMovements(pending, movements);
  } catch (error) {
    const isBusinessError = error instanceof AppError && error.isBusinessRule;

    await prisma.transaction.update({
      where: { id: pending.id },
      data: {
        status: 'FAILED',
        failureReason: error instanceof AppError ? error.code : 'INTERNAL_ERROR',
      },
    });

    if (isBusinessError) {
      throw AppError.businessRule(error.code, error.message, {
        referenceNo: pending.referenceNo,
      });
    }

    throw error;
  }
}
