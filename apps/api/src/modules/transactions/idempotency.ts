import { createHash } from 'node:crypto';
import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';
import type { TransactionModel } from '@/generated/prisma/models';
import type { TransactionType } from '@/generated/prisma/enums';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/utils/app-error';

type HashValue = string | null;
type HashPayload = Record<string, HashValue>;

export const idempotencyKeySchema = z.uuid('Idempotency-Key geçerli bir UUID olmalı');

export function hashRequest(type: TransactionType, payload: HashPayload): string {
  const canonicalPayload = Object.fromEntries(
    Object.entries(payload).sort(([left], [right]) => {
      if (left < right) return -1;
      if (left > right) return 1;
      return 0;
    }),
  );

  return createHash('sha256')
    .update(JSON.stringify({ type, payload: canonicalPayload }))
    .digest('hex');
}

export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export async function findIdempotentTransaction(
  initiatedById: string,
  idempotencyKey: string,
  requestHash: string,
): Promise<TransactionModel | null> {
  const transaction = await prisma.transaction.findUnique({
    where: {
      initiatedById_idempotencyKey: { initiatedById, idempotencyKey },
    },
  });

  if (transaction && transaction.requestHash !== requestHash) {
    throw new AppError(
      409,
      'IDEMPOTENCY_KEY_REUSED',
      'Idempotency key was already used with a different request',
    );
  }

  return transaction;
}
