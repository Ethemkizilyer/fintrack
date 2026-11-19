import type { Prisma } from '@/generated/prisma/client';

export function formatAmount(value: Prisma.Decimal): string {
  return value.toFixed(2);
}
