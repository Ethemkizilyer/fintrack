import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { env } from '@/config/env';

const isTest = env.NODE_ENV === 'test';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? ''),
  skip: () => isTest,
  message: {
    error: { code: 'RATE_LIMITED', message: 'Too many attempts, please try again later' },
  },
});

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? ''),
  skip: () => isTest,
});
