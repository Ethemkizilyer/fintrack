import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '@/utils/app-error';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation error',
        details: err.issues,
      },
    });
    return;
  }
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details === undefined ? {} : { details: err.details }),
      },
    });
    return;
  }
  if (err instanceof Error && 'code' in err && err.code === 'P2002') {
    res.status(409).json({
      error: {
        code: 'CONFLICT',
        message: 'A record with this value already exists',
      },
    });
    return;
  }
  if (err instanceof Error && 'code' in err && err.code === '55P03') {
    res.status(503).json({
      error: {
        code: 'LOCK_TIMEOUT',
        message: 'Service temporarily busy, please retry',
      },
    });
    return;
  }
  req.log.error(err, 'Unhandled error');
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Internal server error',
    },
  });
}
