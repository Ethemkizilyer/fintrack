import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '@/app';
import { openApiDocument } from './openapi';

describe('OpenAPI documentation', () => {
  it('documents every API route and the required security/header contracts', () => {
    const paths = Object.keys(openApiDocument.paths ?? {});

    expect(paths).toEqual(
      expect.arrayContaining([
        '/health',
        '/auth/login',
        '/auth/refresh',
        '/auth/logout',
        '/auth/me',
        '/customers',
        '/customers/{id}',
        '/accounts',
        '/accounts/{id}',
        '/accounts/{id}/status',
        '/accounts/{id}/transactions',
        '/transactions/deposits',
        '/transactions/withdrawals',
        '/transactions/transfers',
        '/transactions/{id}',
        '/reports/summary',
        '/reports/periodic',
        '/reports/accounts/{id}/statement',
        '/reports/transaction-stats',
      ]),
    );

    const documentJson = JSON.stringify(openApiDocument);
    expect(documentJson).toContain('BearerAuth');
    expect(documentJson).toContain('Idempotency-Key');
    expect(documentJson).toContain('RATE_LIMITED');
    expect(documentJson).toContain('VALIDATION_ERROR');
  });

  it('serves Swagger UI at /api/docs', async () => {
    const response = await request(app).get('/api/docs').redirects(1);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
  });
});
