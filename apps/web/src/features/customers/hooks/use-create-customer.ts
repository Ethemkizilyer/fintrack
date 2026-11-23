import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCustomer } from '../api/customers.api';
import { customerKeys } from '../customer.keys';

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCustomer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customerKeys.all }),
  });
}
