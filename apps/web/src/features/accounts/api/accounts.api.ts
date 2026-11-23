import type {
  ApiSuccess,
  CreateAccountInput,
  ListAccountsQuery,
  PublicAccount,
} from '@fintrack/shared';
import { apiClient } from '@/lib/api-client';

export async function fetchAccounts(query: ListAccountsQuery = {}): Promise<PublicAccount[]> {
  const { data } = await apiClient.get<ApiSuccess<PublicAccount[]>>('/accounts', {
    params: query,
  });
  return data.data;
}

export async function createAccount(input: CreateAccountInput): Promise<PublicAccount> {
  const { data } = await apiClient.post<ApiSuccess<PublicAccount>>('/accounts', input);
  return data.data;
}
