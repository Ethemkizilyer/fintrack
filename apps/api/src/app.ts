import express from 'express';
import { pinoHttp } from 'pino-http';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { errorHandler } from '@/middlewares/error-handler';
import { notFoundHandler } from '@/middlewares/not-found';
import { router } from '@/routes';
import { apiRateLimiter } from './middlewares/rate-limits';

export const app = express();

app.use(
  pinoHttp({
    logger,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'req.body.passwordHash',
        'req.body.nationalId',
        '*.password',
        '*.passwordHash',
        '*.nationalId',
      ],
      censor: '[Redacted]',
    },
  }),
);
app.use(helmet());
app.use(cors({ origin: env.WEB_URL, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use('/api/v1', apiRateLimiter, router);
app.use(notFoundHandler);
app.use(errorHandler);
