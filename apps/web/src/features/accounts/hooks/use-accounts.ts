import { useQuery } from '@tanstack/react-query';
import type { ListAccountsQuery } from '@fintrack/shared';
import { fetchAccounts } from '../api/accounts.api';
import { accountKeys } from '../account.keys';

export function useAccounts(query: ListAccountsQuery = {}) {
  return useQuery({
    queryKey: accountKeys.list(query),
    queryFn: () => fetchAccounts(query),
  });
}
