import type { AccountTransactionsQuery } from '@fintrack/shared';

export const transactionKeys = {
  all: ['transactions'] as const,
  accountHistory: (accountId: string, query: AccountTransactionsQuery) =>
    [...transactionKeys.all, 'account', accountId, query] as const,
  detail: (id: string) => [...transactionKeys.all, 'detail', id] as const,
};
