import { XMLParser } from 'fast-xml-parser';
import { z } from 'zod';
import {
  exchangeRateSchema,
  exchangeRatesResponseSchema,
  type ExchangeRatesResponse,
} from '@fintrack/shared';
import { logger } from '@/lib/logger';
import { AppError } from '@/utils/app-error';

const TCMB_URL = 'https://www.tcmb.gov.tr/kurlar/today.xml';
const CACHE_TTL_MS = 15 * 60 * 1000;
const RETRY_DELAY_MS = 30 * 1000;

const tcmbCurrencySchema = z.object({
  '@_Kod': z.string().optional(),
  '@_CurrencyCode': z.string().optional(),
  Unit: z.string().optional(),
  ForexBuying: z.string().optional(),
  ForexSelling: z.string().optional(),
});

const tcmbDocumentSchema = z.object({
  Tarih_Date: z.object({
    '@_Tarih': z.string(),
    Currency: z.union([tcmbCurrencySchema, z.array(tcmbCurrencySchema)]),
  }),
});

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: false,
  trimValues: true,
  processEntities: false,
});

let cachedRates: ExchangeRatesResponse | null = null;
let cacheValidUntil = 0;
let refreshInFlight: Promise<ExchangeRatesResponse> | null = null;

function parseBulletinDate(value: string): string {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  if (!match) throw new Error('Invalid TCMB bulletin date');

  return z.iso.date().parse(`${match[3]}-${match[2]}-${match[1]}`);
}

async function fetchTcmRates(): Promise<ExchangeRatesResponse> {
  const response = await fetch(TCMB_URL, {
    headers: { Accept: 'application/xml, text/xml' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`TCMB returned ${response.status}`);

  const xml = await response.text();
  const parsed: unknown = parser.parse(xml);
  const document = tcmbDocumentSchema.parse(parsed);
  const rows = Array.isArray(document.Tarih_Date.Currency)
    ? document.Tarih_Date.Currency
    : [document.Tarih_Date.Currency];
  const wanted = new Map<string, ExchangeRatesResponse['rates'][number]>();

  for (const row of rows) {
    const currency = row['@_Kod'] ?? row['@_CurrencyCode'];
    if (currency !== 'USD' && currency !== 'EUR') continue;

    wanted.set(
      currency,
      exchangeRateSchema.parse({
        currency,
        unit: row.Unit,
        forexBuying: row.ForexBuying,
        forexSelling: row.ForexSelling,
      }),
    );
  }

  const rates = ['USD', 'EUR'].map((currency) => {
    const rate = wanted.get(currency);
    if (!rate) throw new Error(`TCMB ${currency} rate is missing`);
    return rate;
  });

  return exchangeRatesResponseSchema.parse({
    source: 'TCMB',
    bulletinDate: parseBulletinDate(document.Tarih_Date['@_Tarih']),
    fetchedAt: new Date().toISOString(),
    isStale: false,
    rates,
  });
}

export async function getExchangeRates(): Promise<ExchangeRatesResponse> {
  if (cachedRates && Date.now() < cacheValidUntil) return cachedRates;
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = fetchTcmRates()
    .then((rates) => {
      cachedRates = rates;
      cacheValidUntil = Date.now() + CACHE_TTL_MS;
      return rates;
    })
    .catch((error: unknown) => {
      logger.warn({ err: error }, 'Failed to refresh TCMB exchange rates');
      if (cachedRates) {
        cachedRates = { ...cachedRates, isStale: true };
        cacheValidUntil = Date.now() + RETRY_DELAY_MS;
        return cachedRates;
      }

      throw AppError.serviceUnavailable(
        'EXCHANGE_RATE_UNAVAILABLE',
        'Exchange rates are temporarily unavailable',
      );
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}
