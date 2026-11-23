import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ListCustomersQuery } from '@fintrack/shared';
import { fetchCustomers } from '../api/customers.api';
import { customerKeys } from '../customer.keys';

export function useCustomers(query: ListCustomersQuery) {
  return useQuery({
    queryKey: customerKeys.list(query),
    queryFn: () => fetchCustomers(query),
    placeholderData: keepPreviousData,
  });
}
