import express from 'express';
import { ipKeyGenerator } from 'express-rate-limit';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createRateLimiter, rateLimitPolicies } from './rate-limits';

interface ErrorResponseBody {
  error: {
    code: string;
  };
}

describe('rate limit policies', () => {
  it('uses the required thresholds', () => {
    expect(rateLimitPolicies).toEqual({
      login: { windowMs: 15 * 60 * 1000, limit: 10 },
      moneyOperation: { windowMs: 60 * 1000, limit: 30 },
      api: { windowMs: 60 * 1000, limit: 300 },
    });
  });

  it('limits login attempts by IP', async () => {
    const app = express();
    const limiter = createRateLimiter(
      {
        ...rateLimitPolicies.login,
        keyGenerator: (req) => ipKeyGenerator(req.ip ?? ''),
      },
      false,
    );

    app.post('/login', limiter, (_req, res) => res.json({ data: { ok: true } }));

    for (let attempt = 0; attempt < rateLimitPolicies.login.limit; attempt += 1) {
      expect((await request(app).post('/login')).status).toBe(200);
    }

    const limited = await request(app).post('/login');
    const body = limited.body as ErrorResponseBody;
    expect(limited.status).toBe(429);
    expect(body.error.code).toBe('RATE_LIMITED');
  });

  it('limits money operations per authenticated user', async () => {
    const app = express();
    const limiter = createRateLimiter(
      {
        ...rateLimitPolicies.moneyOperation,
        keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? ''),
      },
      false,
    );

    app.use((req, _res, next) => {
      const userId = req.header('x-test-user') ?? 'missing-user';
      req.user = { id: userId, role: 'CUSTOMER', customerId: userId };
      next();
    });
    app.post('/money', limiter, (_req, res) => res.json({ data: { ok: true } }));

    for (let attempt = 0; attempt < rateLimitPolicies.moneyOperation.limit; attempt += 1) {
      const response = await request(app).post('/money').set('x-test-user', 'user-1');
      expect(response.status).toBe(200);
    }

    const limited = await request(app).post('/money').set('x-test-user', 'user-1');
    const body = limited.body as ErrorResponseBody;
    expect(limited.status).toBe(429);
    expect(body.error.code).toBe('RATE_LIMITED');

    const otherUser = await request(app).post('/money').set('x-test-user', 'user-2');
    expect(otherUser.status).toBe(200);
  });
});
