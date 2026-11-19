import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/utils/app-error';
import type { AccessTokenPayload } from '@/modules/auth/auth.service';

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw AppError.unauthorized('Missing or invalid Authorization header');
  }

  let payload: AccessTokenPayload;
  try {
    payload = jwt.verify(
      header.slice('Bearer '.length),
      env.JWT_ACCESS_SECRET,
    ) as AccessTokenPayload;
  } catch {
    throw AppError.unauthorized('Invalid or expired token');
  }
  if (typeof payload.sub !== 'string' || typeof payload.role !== 'string') {
    throw AppError.unauthorized('Invalid token payload');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { customer: true },
  });
  if (!user || (user.customer && user.customer.status !== 'ACTIVE')) {
    throw AppError.unauthorized('Invalid or expired token');
  }

  req.user = { id: user.id, role: user.role, customerId: user.customer?.id ?? null };
  next();
}
