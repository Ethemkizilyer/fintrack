import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { AccountTransactionsQuery } from '@fintrack/shared';
import { fetchAccountHistory } from '../api/transactions.api';
import { transactionKeys } from '../transaction.keys';

export function useAccountHistory(accountId: string, query: AccountTransactionsQuery) {
  return useQuery({
    queryKey: transactionKeys.accountHistory(accountId, query),
    queryFn: () => fetchAccountHistory(accountId, query),
    enabled: Boolean(accountId),
    placeholderData: keepPreviousData,
  });
}
