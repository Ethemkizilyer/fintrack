import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '@/app';
import { createAccount, createCustomer, loginAs, loginUser } from '../../../tests/helpers';

type SummaryRow = {
  currency: string;
  totalCredits: string;
  totalDebits: string;
  net: string;
};

type SummaryResponse = {
  data: SummaryRow[];
};

async function postDeposit(token: string, accountId: string, amount: string) {
  return request(app)
    .post('/api/v1/transactions/deposits')
    .set('Authorization', `Bearer ${token}`)
    .set('Idempotency-Key', randomUUID())
    .send({ accountId, amount });
}

async function postWithdrawal(token: string, accountId: string, amount: string) {
  return request(app)
    .post('/api/v1/transactions/withdrawals')
    .set('Authorization', `Bearer ${token}`)
    .set('Idempotency-Key', randomUUID())
    .send({ accountId, amount });
}

function createDateRange() {
  return {
    from: new Date(Date.now() - 86_400_000).toISOString(),
    to: new Date(Date.now() + 86_400_000).toISOString(),
  };
}

describe('GET /api/v1/reports/summary', () => {
  it('returns totals by currency and only includes the customer own accounts', async () => {
    const owner = await createCustomer();
    const otherOwner = await createCustomer();

    const tryAccount = await createAccount(owner.customer.id, 'TRY');
    const usdAccount = await createAccount(owner.customer.id, 'USD');
    await createAccount(owner.customer.id, 'EUR');
    const otherAccount = await createAccount(otherOwner.customer.id, 'TRY');

    const ownerToken = await loginUser(owner.user.email);
    const otherToken = await loginUser(otherOwner.user.email);

    expect((await postDeposit(ownerToken, tryAccount.id, '100.00')).status).toBe(201);
    expect((await postWithdrawal(ownerToken, tryAccount.id, '25.00')).status).toBe(201);
    expect((await postDeposit(ownerToken, usdAccount.id, '50.00')).status).toBe(201);
    expect((await postDeposit(otherToken, otherAccount.id, '90.00')).status).toBe(201);

    const response = await request(app)
      .get('/api/v1/reports/summary')
      .set('Authorization', `Bearer ${ownerToken}`)
      .query(createDateRange());

    expect(response.status).toBe(200);
    const body = response.body as SummaryResponse;

    expect(body.data).toContainEqual({
      currency: 'TRY',
      totalCredits: '100.00',
      totalDebits: '25.00',
      net: '75.00',
    });
    expect(body.data).toContainEqual({
      currency: 'USD',
      totalCredits: '50.00',
      totalDebits: '0.00',
      net: '50.00',
    });
    expect(body.data).toContainEqual({
      currency: 'EUR',
      totalCredits: '0.00',
      totalDebits: '0.00',
      net: '0.00',
    });
    expect(body.data).toHaveLength(3);

    const forbiddenAccount = await request(app)
      .get('/api/v1/reports/summary')
      .set('Authorization', `Bearer ${ownerToken}`)
      .query({ ...createDateRange(), accountId: otherAccount.id });

    expect(forbiddenAccount.status).toBe(404);

    const ownAccount = await request(app)
      .get('/api/v1/reports/summary')
      .set('Authorization', `Bearer ${ownerToken}`)
      .query({ ...createDateRange(), accountId: tryAccount.id });

    expect(ownAccount.status).toBe(200);
    const ownAccountBody = ownAccount.body as SummaryResponse;
    expect(ownAccountBody.data).toEqual([
      {
        currency: 'TRY',
        totalCredits: '100.00',
        totalDebits: '25.00',
        net: '75.00',
      },
    ]);
  });

  it('allows admins to summarize accounts belonging to different customers', async () => {
    const customer = await createCustomer();
    const account = await createAccount(customer.customer.id, 'TRY');
    const customerToken = await loginUser(customer.user.email);
    const adminToken = await loginAs('ADMIN');

    expect((await postDeposit(customerToken, account.id, '40.00')).status).toBe(201);

    const response = await request(app)
      .get('/api/v1/reports/summary')
      .set('Authorization', `Bearer ${adminToken}`)
      .query(createDateRange());

    expect(response.status).toBe(200);
    const body = response.body as SummaryResponse;

    expect(body.data).toContainEqual({
      currency: 'TRY',
      totalCredits: '40.00',
      totalDebits: '0.00',
      net: '40.00',
    });
  });

  it('returns 400 for invalid date ranges and 401 without authentication', async () => {
    const customer = await createCustomer();
    const token = await loginUser(customer.user.email);

    const reversedRange = await request(app)
      .get('/api/v1/reports/summary')
      .set('Authorization', `Bearer ${token}`)
      .query({
        from: '2026-11-21T00:00:00.000Z',
        to: '2026-11-20T00:00:00.000Z',
      });

    const rangeOverOneYear = await request(app)
      .get('/api/v1/reports/summary')
      .set('Authorization', `Bearer ${token}`)
      .query({
        from: '2025-01-01T00:00:00.000Z',
        to: '2026-01-02T00:00:00.000Z',
      });

    const unauthenticated = await request(app)
      .get('/api/v1/reports/summary')
      .query(createDateRange());

    expect(reversedRange.status).toBe(400);
    expect(rangeOverOneYear.status).toBe(400);
    expect(unauthenticated.status).toBe(401);
  });
});
