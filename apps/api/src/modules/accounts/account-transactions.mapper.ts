import { Prisma } from '@/generated/prisma/client';
import { formatAmount } from '@/utils/money';

export type AccountTransactionRecord = Prisma.TransactionGetPayload<{
  include: {
    ledgerEntries: {
      select: {
        direction: true;
        balanceAfter: true;
      };
    };
  };
}>;

export function toPublicAccountTransaction(
  transaction: AccountTransactionRecord,
  accountId: string,
) {
  const ledgerEntry = transaction.ledgerEntries[0];

  const direction =
    ledgerEntry?.direction ??
    (transaction.sourceAccountId === accountId
      ? 'DEBIT'
      : transaction.targetAccountId === accountId
        ? 'CREDIT'
        : null);

  return {
    id: transaction.id,
    referenceNo: transaction.referenceNo,
    type: transaction.type,
    status: transaction.status,
    amount: formatAmount(transaction.amount),
    currency: transaction.currency,
    direction,
    balanceAfter: ledgerEntry ? formatAmount(ledgerEntry.balanceAfter) : null,
    description: transaction.description,
    failureReason: transaction.failureReason,
    createdAt: transaction.createdAt.toISOString(),
    completedAt: transaction.completedAt?.toISOString() ?? null,
  };
}
