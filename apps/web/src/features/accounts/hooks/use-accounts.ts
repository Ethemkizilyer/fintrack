import { useQuery } from '@tanstack/react-query';
import type { ListAccountsQuery } from '@fintrack/shared';
import { fetchAccountById, fetchAccounts } from '../api/accounts.api';
import { accountKeys } from '../account.keys';

export function useAccounts(query: ListAccountsQuery = {}) {
  return useQuery({
    queryKey: accountKeys.list(query),
    queryFn: () => fetchAccounts(query),
  });
}

export function useAccountOptions(search: string, status?: 'ACTIVE' | 'PASSIVE') {
  const normalizedSearch = search.trim();
  const query: ListAccountsQuery = {
    ...(normalizedSearch.length >= 2 ? { search: normalizedSearch } : {}),
    ...(status ? { status } : {}),
    limit: 20,
  };

  return useQuery({
    queryKey: accountKeys.list(query),
    queryFn: () => fetchAccounts(query),
    enabled: normalizedSearch.length === 0 || normalizedSearch.length >= 2,
  });
}

export function useAccountById(id?: string) {
  return useQuery({
    queryKey: accountKeys.detail(id ?? ''),
    queryFn: () => fetchAccountById(id!),
    enabled: Boolean(id),
  });
}
