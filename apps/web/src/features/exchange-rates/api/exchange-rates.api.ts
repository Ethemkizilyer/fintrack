import type { ApiSuccess, ExchangeRatesResponse } from '@fintrack/shared';
import { apiClient } from '@/lib/api-client';

export async function fetchExchangeRates(): Promise<ExchangeRatesResponse> {
  const { data } = await apiClient.get<ApiSuccess<ExchangeRatesResponse>>('/exchange-rates');
  return data.data;
}
