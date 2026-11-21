import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';

const AMOUNT_PATTERN = /^\d{1,15}(\.\d{1,2})?$/;

export const amountSchema = z
  .string()
  .regex(AMOUNT_PATTERN, 'Tutar en fazla 15 tam basamak ve 2 ondalık içerebilir')
  .pipe(
    z
      .string()
      .refine((value) => new Prisma.Decimal(value).greaterThan(0), 'Tutar sıfırdan büyük olmalı'),
  );

export function toDecimal(value: string | Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

export function formatAmount(value: Prisma.Decimal): string {
  return value.toFixed(2);
}
