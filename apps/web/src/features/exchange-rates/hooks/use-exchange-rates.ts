import { useQuery } from '@tanstack/react-query';
import { fetchExchangeRates } from '../api/exchange-rates.api';
import { exchangeRateKeys } from '../exchange-rate.keys';

export function useExchangeRates() {
  return useQuery({
    queryKey: exchangeRateKeys.latest,
    queryFn: fetchExchangeRates,
    staleTime: 15 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
  });
}
