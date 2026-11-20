import type { TransactionModel } from '@/generated/prisma/models';
import { formatAmount } from '@/utils/money';

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
