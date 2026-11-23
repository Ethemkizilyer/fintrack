import { useQuery } from '@tanstack/react-query';
import { fetchTransaction } from '../api/transactions.api';
import { transactionKeys } from '../transaction.keys';

export function useTransaction(id: string | null) {
  return useQuery({
    queryKey: transactionKeys.detail(id ?? ''),
    queryFn: () => fetchTransaction(id ?? ''),
    enabled: Boolean(id),
  });
}
