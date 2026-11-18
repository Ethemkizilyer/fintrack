import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '@/app';

describe('health endpoint', () => {
  it('returns 200 with standard response envelope', async () => {
    const res = await request(app).get('/api/v1/health').expect(200);

    expect(res.body).toEqual({ data: { status: 'ok' } });
  });
});

describe('unknown routes', () => {
  it('returns 404 in standard error format', async () => {
    const res = await request(app).get('/api/v1/missing').expect(404);

    expect(res.body).toMatchObject({ error: { code: 'NOT_FOUND' } });
  });
});

describe('malformed request', () => {
  it('returns 500 in standard error format for invalid JSON', async () => {
    const res = await request(app)
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send('{invalid')
      .expect(500);

    expect(res.body).toMatchObject({ error: { code: 'INTERNAL_SERVER_ERROR' } });
  });
});
