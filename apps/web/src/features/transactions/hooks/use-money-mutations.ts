import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateMoneyOperationInput, CreateTransferInput } from '@fintrack/shared';
import { accountKeys } from '@/features/accounts/account.keys';
import { reportKeys } from '@/features/reports/report.keys';
import { createDeposit, createTransfer, createWithdrawal } from '../api/transactions.api';
import { transactionKeys } from '../transaction.keys';

type MoneyOperation = {
  input: CreateMoneyOperationInput;
  idempotencyKey: string;
};

type TransferOperation = {
  input: CreateTransferInput;
  idempotencyKey: string;
};

function useInvalidateMoneyQueries() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: accountKeys.all }),
      queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
      queryClient.invalidateQueries({ queryKey: reportKeys.all }),
    ]);
}

export function useCreateDeposit() {
  const invalidate = useInvalidateMoneyQueries();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: MoneyOperation) => createDeposit(input, idempotencyKey),
    onSuccess: invalidate,
  });
}

export function useCreateWithdrawal() {
  const invalidate = useInvalidateMoneyQueries();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: MoneyOperation) =>
      createWithdrawal(input, idempotencyKey),
    onSuccess: invalidate,
  });
}

export function useCreateTransfer() {
  const invalidate = useInvalidateMoneyQueries();
  return useMutation({
    mutationFn: ({ input, idempotencyKey }: TransferOperation) =>
      createTransfer(input, idempotencyKey),
    onSuccess: invalidate,
  });
}
