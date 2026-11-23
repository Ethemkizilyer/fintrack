import { Prisma } from '@/generated/prisma/client';
import { amountSchema } from '@fintrack/shared';

export { amountSchema };

export function toDecimal(value: string | Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

export function formatAmount(value: Prisma.Decimal): string {
  return value.toFixed(2);
}
