import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '@/app';
import { TEST_PASSWORD, createCustomer, loginAs } from '../../../tests/helpers';

const ADMIN = () => loginAs('ADMIN');
const VALID = {
  email: 'new@example.com',
  password: 'password123',
  firstName: 'Yeni',
  lastName: 'Müşteri',
  nationalId: '12345678950',
  phone: '+905001112233',
};

describe('POST /api/v1/customers', () => {
  it('creates user + customer and returns 201', async () => {
    const res = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${await ADMIN()}`)
      .send(VALID);

    expect(res.status).toBe(201);
    const body = res.body as { data: { email: string; status: string } };
    expect(body.data.email).toBe('new@example.com');
    expect(body.data.status).toBe('ACTIVE');
    expect(body.data).not.toHaveProperty('passwordHash');

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: VALID.email, password: VALID.password });
    expect(login.status).toBe(200);
  });

  it('returns 403 for a CUSTOMER', async () => {
    const res = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${await loginAs('CUSTOMER')}`)
      .send(VALID);
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid national id', async () => {
    const res = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${await ADMIN()}`)
      .send({ ...VALID, nationalId: '12345678951' });
    expect(res.status).toBe(400);
  });

  it('returns 409 for duplicate national id', async () => {
    const { customer } = await createCustomer();
    const res = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${await ADMIN()}`)
      .send({ ...VALID, nationalId: customer.nationalId });
    expect(res.status).toBe(409);
  });
});

describe('GET /api/v1/customers', () => {
  it('returns paginated list for admin', async () => {
    await createCustomer();
    const res = await request(app)
      .get('/api/v1/customers?limit=10')
      .set('Authorization', `Bearer ${await ADMIN()}`);

    expect(res.status).toBe(200);
    const body = res.body as { data: unknown[]; meta: { total: number; totalPages: number } };
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.meta.total).toBeGreaterThan(0);
  });

  it('filters by search', async () => {
    await createCustomer({ email: 'findme@example.com' });
    const res = await request(app)
      .get('/api/v1/customers?search=findme')
      .set('Authorization', `Bearer ${await ADMIN()}`);

    const body = res.body as { data: { email: string }[] };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.email).toBe('findme@example.com');
  });
});

describe('PATCH /api/v1/customers/:id', () => {
  it('blocks login after setting status PASSIVE', async () => {
    const { customer, user } = await createCustomer();

    const patch = await request(app)
      .patch(`/api/v1/customers/${customer.id}`)
      .set('Authorization', `Bearer ${await ADMIN()}`)
      .send({ status: 'PASSIVE' });
    expect(patch.status).toBe(200);

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: TEST_PASSWORD });
    expect(login.status).toBe(403);
  });
});
