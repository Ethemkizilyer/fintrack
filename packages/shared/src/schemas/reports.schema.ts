import { z } from 'zod';
import { currencySchema } from './accounts.schema';
import { transactionStatusSchema, transactionTypeSchema } from './transactions.schema';

export const reportSummarySchema = z.object({
  currency: currencySchema,
  totalCredits: z.string(),
  totalDebits: z.string(),
  net: z.string(),
});

export const periodicReportItemSchema = z.object({
  periodStart: z.iso.datetime(),
  currency: currencySchema,
  totalCredits: z.string(),
  totalDebits: z.string(),
  transactionCount: z.number().int(),
});

export const accountStatementSchema = z.object({
  accountId: z.uuid(),
  currency: currencySchema,
  from: z.iso.datetime(),
  to: z.iso.datetime(),
  openingBalance: z.string(),
  movements: z.array(
    z.object({
      id: z.uuid(),
      transactionId: z.uuid(),
      referenceNo: z.string(),
      type: transactionTypeSchema,
      status: transactionStatusSchema,
      direction: z.enum(['CREDIT', 'DEBIT']),
      amount: z.string(),
      balanceAfter: z.string(),
      description: z.string().nullable(),
      createdAt: z.iso.datetime(),
    }),
  ),
  closingBalance: z.string(),
});

export const transactionStatsSchema = z.object({
  from: z.iso.datetime(),
  to: z.iso.datetime(),
  totalTransactions: z.number().int(),
  completedTransactions: z.number().int(),
  failedTransactions: z.number().int(),
  pendingTransactions: z.number().int(),
  successRate: z.number(),
  byTypeAndStatus: z.array(
    z.object({
      type: transactionTypeSchema,
      status: transactionStatusSchema,
      count: z.number().int(),
      totalAmount: z.string(),
    }),
  ),
  failuresByReason: z.array(z.object({ reason: z.string(), count: z.number().int() })),
});

export type ReportSummary = z.infer<typeof reportSummarySchema>;
export type PeriodicReportItem = z.infer<typeof periodicReportItemSchema>;
export type AccountStatement = z.infer<typeof accountStatementSchema>;
export type TransactionStats = z.infer<typeof transactionStatsSchema>;

export const reportSummaryQuerySchema = z
  .object({
    from: z.iso.datetime({ error: 'Başlangıç tarihi geçerli bir ISO tarih olmalı' }),
    to: z.iso.datetime({ error: 'Bitiş tarihi geçerli bir ISO tarih olmalı' }),
    accountId: z.uuid('Geçersiz hesap kimliği').optional(),
  })
  .superRefine((query, ctx) => {
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
  });

export const reportPeriodicQuerySchema = z
  .object({
    from: z.iso.datetime({ error: 'Başlangıç tarihi geçerli bir ISO tarih olmalı' }),
    to: z.iso.datetime({ error: 'Bitiş tarihi geçerli bir ISO tarih olmalı' }),
    accountId: z.uuid('Geçersiz hesap kimliği').optional(),
    period: z.enum(['day', 'week', 'month']),
  })
  .superRefine((query, ctx) => {
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
  });

export const reportStatementParamsSchema = z.object({
  id: z.uuid('Geçersiz hesap kimliği'),
});

export const reportStatementQuerySchema = z
  .object({
    from: z.iso.datetime({ error: 'Başlangıç tarihi geçerli bir ISO tarih olmalı' }),
    to: z.iso.datetime({ error: 'Bitiş tarihi geçerli bir ISO tarih olmalı' }),
  })
  .superRefine((query, ctx) => {
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
  });

export const reportTransactionStatsQuerySchema = z
  .object({
    from: z.iso.datetime({ error: 'Başlangıç tarihi geçerli bir ISO tarih olmalı' }),
    to: z.iso.datetime({ error: 'Bitiş tarihi geçerli bir ISO tarih olmalı' }),
  })
  .superRefine((query, ctx) => {
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
  });

export type ReportTransactionStatsQuery = z.infer<typeof reportTransactionStatsQuerySchema>;
export type ReportStatementParams = z.infer<typeof reportStatementParamsSchema>;
export type ReportStatementQuery = z.infer<typeof reportStatementQuerySchema>;
export type ReportPeriodicQuery = z.infer<typeof reportPeriodicQuerySchema>;
export type ReportSummaryQuery = z.infer<typeof reportSummaryQuerySchema>;
