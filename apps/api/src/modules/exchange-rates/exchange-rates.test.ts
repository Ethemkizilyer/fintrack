import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ExchangeRatesResponse } from '@fintrack/shared';
import { app } from '@/app';
import { loginAs } from '../../../tests/helpers';

const TCMB_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Tarih_Date Tarih="23.11.2026" Date="11/23/2026" Bulten_No="2026/224">
  <Currency Kod="USD" CurrencyCode="USD"><Unit>1</Unit><ForexBuying>42.1234</ForexBuying><ForexSelling>42.1987</ForexSelling></Currency>
  <Currency Kod="EUR" CurrencyCode="EUR"><Unit>1</Unit><ForexBuying>48.2345</ForexBuying><ForexSelling>48.3456</ForexSelling></Currency>
</Tarih_Date>`;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GET /api/v1/exchange-rates', () => {
  it('requires authentication', async () => {
    const response = await request(app).get('/api/v1/exchange-rates');

    expect(response.status).toBe(401);
  });

  it('returns 503 when the TCMB source is unavailable and no cached bulletin exists', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })));

    const response = await request(app)
      .get('/api/v1/exchange-rates')
      .set('Authorization', `Bearer ${await loginAs('ADMIN')}`);

    expect(response.status).toBe(503);
    const body = response.body as { error: { code: string } };
    expect(body.error.code).toBe('EXCHANGE_RATE_UNAVAILABLE');
  });

  it('returns USD/EUR indicative rates and caches a successful bulletin', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(TCMB_XML));
    vi.stubGlobal('fetch', fetchMock);
    const token = await loginAs('ADMIN');

    const first = await request(app)
      .get('/api/v1/exchange-rates')
      .set('Authorization', `Bearer ${token}`);
    const second = await request(app)
      .get('/api/v1/exchange-rates')
      .set('Authorization', `Bearer ${token}`);

    expect(first.status).toBe(200);
    const body = first.body as { data: ExchangeRatesResponse };
    expect(body.data).toMatchObject({
      source: 'TCMB',
      bulletinDate: '2026-11-23',
      isStale: false,
      rates: [
        { currency: 'USD', unit: '1', forexBuying: '42.1234', forexSelling: '42.1987' },
        { currency: 'EUR', unit: '1', forexBuying: '48.2345', forexSelling: '48.3456' },
      ],
    });
    expect(second.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
