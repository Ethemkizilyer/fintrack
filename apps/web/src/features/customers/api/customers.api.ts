import type {
  ApiSuccess,
  CreateCustomerInput,
  ListCustomersQuery,
  PublicCustomer,
  UpdateCustomerInput,
} from '@fintrack/shared';
import { apiClient } from '@/lib/api-client';

export async function fetchCustomers(query: ListCustomersQuery) {
  const { data } = await apiClient.get<ApiSuccess<PublicCustomer[]>>('/customers', {
    params: query,
  });
  return { customers: data.data, meta: data.meta };
}

export async function fetchCustomer(id: string): Promise<PublicCustomer> {
  const { data } = await apiClient.get<ApiSuccess<PublicCustomer>>(`/customers/${id}`);
  return data.data;
}

export async function createCustomer(input: CreateCustomerInput): Promise<PublicCustomer> {
  const { data } = await apiClient.post<ApiSuccess<PublicCustomer>>('/customers', input);
  return data.data;
}

export async function updateCustomer(
  id: string,
  input: UpdateCustomerInput,
): Promise<PublicCustomer> {
  const { data } = await apiClient.patch<ApiSuccess<PublicCustomer>>(`/customers/${id}`, input);
  return data.data;
}
