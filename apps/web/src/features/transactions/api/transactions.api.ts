import type {
  AccountTransactionsQuery,
  ApiSuccess,
  CreateMoneyOperationInput,
  CreateTransferInput,
  PublicTransaction,
  PublicTransactionDetail,
  AccountTransaction,
} from '@fintrack/shared';
import { apiClient } from '@/lib/api-client';

export async function createDeposit(input: CreateMoneyOperationInput, idempotencyKey: string) {
  const { data } = await apiClient.post<ApiSuccess<PublicTransaction>>(
    '/transactions/deposits',
    input,
    { headers: { 'Idempotency-Key': idempotencyKey } },
  );
  return data.data;
}

export async function createWithdrawal(input: CreateMoneyOperationInput, idempotencyKey: string) {
  const { data } = await apiClient.post<ApiSuccess<PublicTransaction>>(
    '/transactions/withdrawals',
    input,
    { headers: { 'Idempotency-Key': idempotencyKey } },
  );
  return data.data;
}

export async function createTransfer(input: CreateTransferInput, idempotencyKey: string) {
  const { data } = await apiClient.post<ApiSuccess<PublicTransaction>>(
    '/transactions/transfers',
    input,
    { headers: { 'Idempotency-Key': idempotencyKey } },
  );
  return data.data;
}

export async function fetchAccountHistory(accountId: string, query: AccountTransactionsQuery) {
  const { data } = await apiClient.get<ApiSuccess<AccountTransaction[]>>(
    `/accounts/${accountId}/transactions`,
    { params: query },
  );
  return { transactions: data.data, meta: data.meta };
}

export async function fetchTransaction(id: string): Promise<PublicTransactionDetail> {
  const { data } = await apiClient.get<ApiSuccess<PublicTransactionDetail>>(`/transactions/${id}`);
  return data.data;
}
