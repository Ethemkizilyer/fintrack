import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '@/app';
import { createAccount, createCustomer, loginUser } from '../../../tests/helpers';

type HistoryResponse = {
  data: {
    id: string;
    type: string;
    status: string;
    amount: string;
    direction: string | null;
    balanceAfter: string | null;
  }[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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

describe('GET /api/v1/accounts/:id/transactions', () => {
  it('filters, sorts, and paginates an account history including failed transactions', async () => {
    const { user, customer } = await createCustomer();
    const account = await createAccount(customer.id);
    const token = await loginUser(user.email);

    expect((await postDeposit(token, account.id, '100.00')).status).toBe(201);
    expect((await postWithdrawal(token, account.id, '25.00')).status).toBe(201);
    expect((await postWithdrawal(token, account.id, '100.00')).status).toBe(422);

    const baseUrl = `/api/v1/accounts/${account.id}/transactions`;

    const allResponse = await request(app)
      .get(baseUrl)
      .set('Authorization', `Bearer ${token}`)
      .query({
        from: new Date(Date.now() - 86_400_000).toISOString(),
        to: new Date(Date.now() + 86_400_000).toISOString(),
      });

    expect(allResponse.status).toBe(200);
    const allBody = allResponse.body as HistoryResponse;
    expect(allBody.data).toHaveLength(3);

    const failedResponse = await request(app)
      .get(baseUrl)
      .set('Authorization', `Bearer ${token}`)
      .query({ status: 'FAILED' });

    const failedBody = failedResponse.body as HistoryResponse;
    expect(failedBody.data).toHaveLength(1);
    expect(failedBody.data[0]?.direction).toBe('DEBIT');
    expect(failedBody.data[0]?.balanceAfter).toBeNull();

    const typeResponse = await request(app)
      .get(baseUrl)
      .set('Authorization', `Bearer ${token}`)
      .query({ type: 'DEPOSIT' });

    const typeBody = typeResponse.body as HistoryResponse;
    expect(typeBody.data).toHaveLength(1);
    expect(typeBody.data[0]?.amount).toBe('100.00');

    const amountResponse = await request(app)
      .get(baseUrl)
      .set('Authorization', `Bearer ${token}`)
      .query({ minAmount: '20.00', maxAmount: '30.00' });

    const amountBody = amountResponse.body as HistoryResponse;
    expect(amountBody.data).toHaveLength(1);
    expect(amountBody.data[0]?.amount).toBe('25.00');

    const pageResponse = await request(app)
      .get(baseUrl)
      .set('Authorization', `Bearer ${token}`)
      .query({ sort: 'amount', order: 'asc', page: '1', limit: '2' });

    const pageBody = pageResponse.body as HistoryResponse;
    expect(pageBody.data).toHaveLength(2);
    expect(pageBody.data[0]?.amount).toBe('25.00');
    expect(pageBody.meta).toEqual({
      page: 1,
      limit: 2,
      total: 3,
      totalPages: 2,
    });
  });

  it('returns 400 for an invalid date range or inverted amount range', async () => {
    const { user, customer } = await createCustomer();
    const account = await createAccount(customer.id);
    const token = await loginUser(user.email);
    const baseUrl = `/api/v1/accounts/${account.id}/transactions`;

    const invertedDates = await request(app)
      .get(baseUrl)
      .set('Authorization', `Bearer ${token}`)
      .query({
        from: '2026-11-21T00:00:00.000Z',
        to: '2026-11-20T00:00:00.000Z',
      });

    const invertedAmounts = await request(app)
      .get(baseUrl)
      .set('Authorization', `Bearer ${token}`)
      .query({ minAmount: '20.00', maxAmount: '10.00' });

    const overOneYear = await request(app)
      .get(baseUrl)
      .set('Authorization', `Bearer ${token}`)
      .query({
        from: '2024-01-01T00:00:00.000Z',
        to: '2025-01-02T00:00:00.000Z',
      });

    expect(invertedDates.status).toBe(400);
    expect(invertedAmounts.status).toBe(400);
    expect(overOneYear.status).toBe(400);
  });

  it('returns 404 for another customer account', async () => {
    const { user } = await createCustomer();
    const { customer: anotherCustomer } = await createCustomer();
    const anotherAccount = await createAccount(anotherCustomer.id);
    const token = await loginUser(user.email);

    const response = await request(app)
      .get(`/api/v1/accounts/${anotherAccount.id}/transactions`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
  });
});
