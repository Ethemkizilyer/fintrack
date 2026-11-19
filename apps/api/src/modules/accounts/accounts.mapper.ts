import type { AccountModel } from '@/generated/prisma/models';
import { formatAmount } from '@/utils/money';

export function toPublicAccount(account: AccountModel) {
  return {
    id: account.id,
    customerId: account.customerId,
    accountNumber: account.accountNumber,
    currency: account.currency,
    balance: formatAmount(account.balance),
    status: account.status,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}
