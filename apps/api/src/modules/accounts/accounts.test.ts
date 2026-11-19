import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '@/app';
import { createAccount, createCustomer, loginAs, loginUser } from '../../../tests/helpers';

const ADMIN = () => loginAs('ADMIN');

describe('POST /api/v1/accounts', () => {
  it('lets a customer open an account with 0.00 balance', async () => {
    const { user, customer } = await createCustomer();
    const token = await loginUser(user.email);

    const res = await request(app)
      .post('/api/v1/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({ currency: 'TRY' });

    expect(res.status).toBe(201);
    const body = res.body as {
      data: { balance: string; customerId: string; accountNumber: string };
    };
    expect(body.data.balance).toBe('0.00');
    expect(body.data.customerId).toBe(customer.id);
    expect(body.data.accountNumber).toHaveLength(16);
  });

  it('lets an admin open an account for a customer', async () => {
    const { customer } = await createCustomer();

    const res = await request(app)
      .post('/api/v1/accounts')
      .set('Authorization', `Bearer ${await ADMIN()}`)
      .send({ customerId: customer.id, currency: 'USD' });

    expect(res.status).toBe(201);
    expect((res.body as { data: { currency: string } }).data.currency).toBe('USD');
  });

  it('ignores customerId sent by a customer', async () => {
    const { user, customer: own } = await createCustomer();
    const { customer: other } = await createCustomer();
    const token = await loginUser(user.email);

    const res = await request(app)
      .post('/api/v1/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({ customerId: other.id, currency: 'TRY' });

    expect(res.status).toBe(201);
    expect((res.body as { data: { customerId: string } }).data.customerId).toBe(own.id);
  });

  it('returns 422 for a passive customer', async () => {
    const { customer } = await createCustomer({ status: 'PASSIVE' });

    const res = await request(app)
      .post('/api/v1/accounts')
      .set('Authorization', `Bearer ${await ADMIN()}`)
      .send({ customerId: customer.id, currency: 'TRY' });

    expect(res.status).toBe(422);
  });
});

describe('GET /api/v1/accounts + /:id', () => {
  it('lists only own accounts for a customer', async () => {
    const { user, customer: own } = await createCustomer();
    const { customer: other } = await createCustomer();
    await createAccount(own.id);
    await createAccount(other.id);
    const token = await loginUser(user.email);

    const res = await request(app).get('/api/v1/accounts').set('Authorization', `Bearer ${token}`);

    const body = res.body as { data: { customerId: string }[] };
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.customerId).toBe(own.id);
  });

  it('returns 404 for another customers account', async () => {
    const { user } = await createCustomer();
    const { customer: other } = await createCustomer();
    const others = await createAccount(other.id);
    const token = await loginUser(user.email);

    const res = await request(app)
      .get(`/api/v1/accounts/${others.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/v1/accounts/:id/status', () => {
  it('lets admin deactivate and reactivate', async () => {
    const { customer } = await createCustomer();
    const account = await createAccount(customer.id);

    const res = await request(app)
      .patch(`/api/v1/accounts/${account.id}/status`)
      .set('Authorization', `Bearer ${await ADMIN()}`)
      .send({ status: 'PASSIVE' });

    expect(res.status).toBe(200);
    expect((res.body as { data: { status: string } }).data.status).toBe('PASSIVE');
  });

  it('returns 403 for a customer', async () => {
    const { customer } = await createCustomer();
    const account = await createAccount(customer.id);

    const res = await request(app)
      .patch(`/api/v1/accounts/${account.id}/status`)
      .set('Authorization', `Bearer ${await loginAs('CUSTOMER')}`)
      .send({ status: 'PASSIVE' });

    expect(res.status).toBe(403);
  });
});
