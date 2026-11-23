import { useQuery } from '@tanstack/react-query';
import { fetchCustomer } from '../api/customers.api';
import { customerKeys } from '../customer.keys';

export function useCustomer(id: string) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => fetchCustomer(id),
    enabled: Boolean(id),
  });
}
