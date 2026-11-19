import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { app } from '@/app';
import { authorize } from '@/middlewares/authorize';
import { AppError } from '@/utils/app-error';
import {
  TEST_PASSWORD,
  createCustomer,
  createUser,
  loginAs,
  loginWithCookie,
} from '../../../tests/helpers';

type ErrorResponse = { error: { code: string; message: string } };

describe('POST /api/v1/auth/login', () => {
  it('returns accessToken, user and an httpOnly refresh cookie', async () => {
    await createUser({ email: 'login@example.com', role: 'ADMIN' });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'login@example.com', password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    const body = res.body as {
      data: { accessToken: string; user: { email: string; role: string } };
    };
    expect(body.data.accessToken).toEqual(expect.any(String));
    expect(body.data.user.email).toBe('login@example.com');
    expect(body.data.user).not.toHaveProperty('passwordHash');

    const headers = res.headers as Record<string, string | string[] | undefined>;
    const setCookie = headers['set-cookie'];
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    expect(cookieHeader).toEqual(expect.stringContaining('refreshToken='));
    expect(cookieHeader).toEqual(expect.stringContaining('HttpOnly'));
    expect(String(cookieHeader)).toContain('refreshToken=');
    expect(String(cookieHeader)).toContain('HttpOnly');
  });

  it('returns the same 401 for wrong password and unknown email', async () => {
    await createUser({ email: 'real@example.com' });

    const wrongPassword = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'real@example.com', password: 'wrong-password' });
    const unknownEmail = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ghost@example.com', password: TEST_PASSWORD });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect((wrongPassword.body as ErrorResponse).error.message).toBe(
      (unknownEmail.body as ErrorResponse).error.message,
    );
  });

  it('rejects a passive customer with 403', async () => {
    const { user } = await createCustomer({ status: 'PASSIVE' });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: TEST_PASSWORD });

    expect(res.status).toBe(403);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns the customer profile for a customer token', async () => {
    const token = await loginAs('CUSTOMER');

    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const body = res.body as { data: { customer: { firstName: string } | null } };
    expect(body.data.customer?.firstName).toBe('Test');
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect((res.body as ErrorResponse).error.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 with a garbage token', async () => {
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer garbage');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/refresh + /logout', () => {
  it('rotates the refresh token and rejects the old one', async () => {
    const { refreshToken } = await loginWithCookie('CUSTOMER');

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refreshToken=${refreshToken}`);

    expect(res.status).toBe(200);

    const reused = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refreshToken=${refreshToken}`);

    expect(reused.status).toBe(401);
  });

  it('revokes the token on logout', async () => {
    const { refreshToken } = await loginWithCookie('CUSTOMER');

    const logout = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', `refreshToken=${refreshToken}`);
    expect(logout.status).toBe(204);

    const refresh = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refreshToken=${refreshToken}`);
    expect(refresh.status).toBe(401);
  });
});

describe('authorize middleware', () => {
  const res = {} as Response;
  const next = vi.fn() as unknown as NextFunction;

  it('throws 403 for a CUSTOMER on an ADMIN-only route', () => {
    const mw = authorize('ADMIN');
    const req = { user: { id: 'u1', role: 'CUSTOMER', customerId: 'c1' } } as Request;

    expect(() => mw(req, res, next)).toThrowError(
      expect.objectContaining({ statusCode: 403 }) as AppError,
    );
  });

  it('calls next for an ADMIN', () => {
    const mw = authorize('ADMIN');
    const req = { user: { id: 'u2', role: 'ADMIN', customerId: null } } as Request;

    mw(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
