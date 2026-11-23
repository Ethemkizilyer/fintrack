import { z } from 'zod';

const rateValueSchema = z.string().regex(/^\d+(?:\.\d{1,8})?$/);

export const exchangeRateSchema = z.object({
  currency: z.enum(['USD', 'EUR']),
  unit: z.string().regex(/^\d+$/),
  forexBuying: rateValueSchema,
  forexSelling: rateValueSchema,
});

export const exchangeRatesResponseSchema = z.object({
  source: z.literal('TCMB'),
  bulletinDate: z.iso.date(),
  fetchedAt: z.iso.datetime(),
  isStale: z.boolean(),
  rates: z.array(exchangeRateSchema).length(2),
});

export type ExchangeRate = z.infer<typeof exchangeRateSchema>;
export type ExchangeRatesResponse = z.infer<typeof exchangeRatesResponseSchema>;
