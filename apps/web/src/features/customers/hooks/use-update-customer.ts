import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UpdateCustomerInput } from '@fintrack/shared';
import { updateCustomer } from '../api/customers.api';
import { customerKeys } from '../customer.keys';

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCustomerInput }) =>
      updateCustomer(id, input),
    onSuccess: (customer) => {
      queryClient.setQueryData(customerKeys.detail(customer.id), customer);
      return queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}
