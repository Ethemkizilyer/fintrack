import express from 'express';
import { pinoHttp } from 'pino-http';
import { logger } from '@/lib/logger';
import { errorHandler } from '@/middlewares/error-handler';
import { notFoundHandler } from '@/middlewares/not-found';
import { router } from '@/routes';

export const app = express();

app.use(express.json({ limit: '100kb' }));
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
app.use('/api/v1', router);
app.use(notFoundHandler);
app.use(errorHandler);
