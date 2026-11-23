import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createAccount } from '../api/accounts.api';
import { accountKeys } from '../account.keys';

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAccount,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: accountKeys.all }),
  });
}
