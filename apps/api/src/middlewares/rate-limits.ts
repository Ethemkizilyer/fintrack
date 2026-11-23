import { ipKeyGenerator, rateLimit, type Options } from 'express-rate-limit';
import { env } from '@/config/env';

const isTest = env.NODE_ENV === 'test';

export const rateLimitPolicies = {
  login: { windowMs: 15 * 60 * 1000, limit: 10 },
  moneyOperation: { windowMs: 60 * 1000, limit: 30 },
  api: { windowMs: 60 * 1000, limit: 300 },
} as const;

const rateLimitMessage = {
  error: {
    code: 'RATE_LIMITED',
    message: 'Too many requests, please try again later',
  },
};

type RateLimiterConfig = {
  windowMs: number;
  limit: number;
  keyGenerator: NonNullable<Options['keyGenerator']>;
};

export function createRateLimiter(config: RateLimiterConfig, skipInTests = true) {
  return rateLimit({
    ...config,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: rateLimitMessage,
    skip: () => isTest && skipInTests,
  });
}

export const authRateLimiter = createRateLimiter({
  ...rateLimitPolicies.login,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? ''),
});

export const moneyOperationRateLimiter = createRateLimiter({
  ...rateLimitPolicies.moneyOperation,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? ''),
});

export const apiRateLimiter = createRateLimiter({
  ...rateLimitPolicies.api,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? ''),
});
