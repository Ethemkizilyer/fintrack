import { Prisma } from '@/generated/prisma/client';
import type { Actor } from '@/types/actor';
import { formatAmount } from '@/utils/money';
import type { TransactionModel } from '@/generated/prisma/models';

type TransactionDetailRecord = Prisma.TransactionGetPayload<{
  include: {
    sourceAccount: {
      select: {
        id: true;
        accountNumber: true;
        customerId: true;
      };
    };
    targetAccount: {
      select: {
        id: true;
        accountNumber: true;
        customerId: true;
      };
    };
    ledgerEntries: {
      orderBy: { createdAt: 'asc' };
      include: {
        account: {
          select: {
            id: true;
            accountNumber: true;
            customerId: true;
          };
        };
      };
    };
  };
}>;

type AccountSnapshot = {
  id: string;
  accountNumber: string;
  customerId: string;
};

function canSeeAccountDetails(actor: Actor, account: AccountSnapshot): boolean {
  return actor.role === 'ADMIN' || account.customerId === actor.customerId;
}

function maskAccountNumber(accountNumber: string): string {
  return `**** **** **** ${accountNumber.slice(-4)}`;
}

function toAccountReference(account: AccountSnapshot | null, actor: Actor) {
  if (!account) return null;

  return {
    accountNumber: canSeeAccountDetails(actor, account)
      ? account.accountNumber
      : maskAccountNumber(account.accountNumber),
  };
}

export function toPublicTransactionDetail(transaction: TransactionDetailRecord, actor: Actor) {
  return {
    id: transaction.id,
    referenceNo: transaction.referenceNo,
    type: transaction.type,
    status: transaction.status,
    amount: formatAmount(transaction.amount),
    currency: transaction.currency,
    sourceAccount: toAccountReference(transaction.sourceAccount, actor),
    targetAccount: toAccountReference(transaction.targetAccount, actor),
    ledgerEntries: transaction.ledgerEntries.map((entry) => ({
      accountNumber: canSeeAccountDetails(actor, entry.account)
        ? entry.account.accountNumber
        : maskAccountNumber(entry.account.accountNumber),
      direction: entry.direction,
      amount: formatAmount(entry.amount),
      balanceAfter: canSeeAccountDetails(actor, entry.account)
        ? formatAmount(entry.balanceAfter)
        : null,
      createdAt: entry.createdAt.toISOString(),
    })),
    description: transaction.description,
    failureReason: transaction.failureReason,
    createdAt: transaction.createdAt.toISOString(),
    completedAt: transaction.completedAt?.toISOString() ?? null,
  };
}
export function toPublicTransaction(transaction: TransactionModel) {
  return {
    id: transaction.id,
    referenceNo: transaction.referenceNo,
    type: transaction.type,
    status: transaction.status,
    amount: formatAmount(transaction.amount),
    currency: transaction.currency,
    sourceAccountId: transaction.sourceAccountId,
    targetAccountId: transaction.targetAccountId,
    description: transaction.description,
    failureReason: transaction.failureReason,
    createdAt: transaction.createdAt.toISOString(),
    completedAt: transaction.completedAt?.toISOString() ?? null,
  };
}
