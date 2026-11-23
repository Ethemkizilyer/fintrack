import { z } from 'zod';

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
