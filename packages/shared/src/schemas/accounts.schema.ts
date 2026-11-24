import { z } from 'zod';
import { amountSchema, compareMoneyAmounts } from './money.schema';

export const currencySchema = z.enum(['TRY', 'USD', 'EUR']);
export const accountStatusSchema = z.enum(['ACTIVE', 'PASSIVE']);

export const publicAccountSchema = z.object({
  id: z.uuid(),
  customerId: z.uuid(),
  owner: z
    .object({
      firstName: z.string(),
      lastName: z.string(),
    })
    .optional(),
  accountNumber: z.string().regex(/^\d{16}$/),
  currency: currencySchema,
  balance: z.string().regex(/^\d{1,17}\.\d{2}$/),
  status: accountStatusSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Currency = z.infer<typeof currencySchema>;
export type PublicAccount = z.infer<typeof publicAccountSchema>;

export const accountTransactionSchema = z.object({
  id: z.uuid(),
  referenceNo: z.string(),
  type: z.enum(['DEPOSIT', 'WITHDRAWAL', 'TRANSFER']),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED']),
  amount: z.string().regex(/^\d{1,15}\.\d{2}$/),
  currency: currencySchema,
  direction: z.enum(['CREDIT', 'DEBIT']).nullable(),
  balanceAfter: z
    .string()
    .regex(/^\d{1,17}\.\d{2}$/)
    .nullable(),
  description: z.string().nullable(),
  failureReason: z.string().nullable(),
  createdAt: z.iso.datetime(),
  completedAt: z.iso.datetime().nullable(),
});

export type AccountTransaction = z.infer<typeof accountTransactionSchema>;

export const createAccountSchema = z.object({
  customerId: z.uuid('Geçersiz müşteri kimliği').optional(),
  currency: currencySchema,
});

export const accountIdParamsSchema = z.object({
  id: z.uuid('Geçersiz hesap kimliği'),
});

export const listAccountsQuerySchema = z.object({
  customerId: z.uuid('Geçersiz müşteri kimliği').optional(),
  status: z.enum(['ACTIVE', 'PASSIVE']).optional(),
  search: z.string().trim().min(2, 'Arama en az 2 karakter olmalı').max(100).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
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
      compareMoneyAmounts(query.minAmount, query.maxAmount) > 0
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['maxAmount'],
        message: 'En düşük tutar en yüksek tutardan büyük olamaz',
      });
    }
  });

export type AccountTransactionsQuery = z.infer<typeof accountTransactionsQuerySchema>;
