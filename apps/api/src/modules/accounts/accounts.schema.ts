import { z } from 'zod';
import { amountSchema, toDecimal } from '@/utils/money';

export const createAccountSchema = z.object({
  customerId: z.uuid('Geçersiz müşteri kimliği').optional(),
  currency: z.enum(['TRY', 'USD', 'EUR']),
});

export const accountIdParamsSchema = z.object({
  id: z.uuid('Geçersiz hesap kimliği'),
});

export const listAccountsQuerySchema = z.object({
  customerId: z.uuid('Geçersiz müşteri kimliği').optional(),
  status: z.enum(['ACTIVE', 'PASSIVE']).optional(),
});

export const updateAccountStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'PASSIVE']),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type ListAccountsQuery = z.infer<typeof listAccountsQuerySchema>;
export type UpdateAccountStatusInput = z.infer<typeof updateAccountStatusSchema>;

export const accountTransactionsQuerySchema = z
  .object({
    from: z.iso.datetime({ error: 'Başlangıç tarihi geçerli bir ISO tarih olmalı' }).optional(),
    to: z.iso.datetime({ error: 'Bitiş tarihi geçerli bir ISO tarih olmalı' }).optional(),
    type: z.enum(['DEPOSIT', 'WITHDRAWAL', 'TRANSFER']).optional(),
    status: z.enum(['PENDING', 'COMPLETED', 'FAILED']).optional(),
    minAmount: amountSchema.optional(),
    maxAmount: amountSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.enum(['createdAt', 'amount']).default('createdAt'),
    order: z.enum(['asc', 'desc']).default('desc'),
  })
  .superRefine((query, ctx) => {
    if (query.from && query.to) {
      const from = new Date(query.from);
      const to = new Date(query.to);

      if (from > to) {
        ctx.addIssue({
          code: 'custom',
          path: ['from'],
          message: 'Başlangıç tarihi bitiş tarihinden sonra olamaz',
        });
      }

      const maxTo = new Date(from);
      maxTo.setUTCFullYear(maxTo.getUTCFullYear() + 1);

      if (to > maxTo) {
        ctx.addIssue({
          code: 'custom',
          path: ['to'],
          message: 'Tarih aralığı bir yıldan uzun olamaz',
        });
      }
    }

    if (
      query.minAmount &&
      query.maxAmount &&
      toDecimal(query.minAmount).greaterThan(query.maxAmount)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['maxAmount'],
        message: 'En düşük tutar en yüksek tutardan büyük olamaz',
      });
    }
  });

export type AccountTransactionsQuery = z.infer<typeof accountTransactionsQuerySchema>;
