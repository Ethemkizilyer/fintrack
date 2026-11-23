import { z } from 'zod';
import { amountSchema } from './money.schema';

const moneyOperationSchema = z.object({
  accountId: z.uuid('Geçersiz hesap kimliği'),
  amount: amountSchema,
  description: z.string().trim().max(500, 'Açıklama en fazla 500 karakter olabilir').optional(),
});

export const createTransferSchema = z.object({
  sourceAccountId: z.uuid('Geçersiz kaynak hesap kimliği'),
  targetAccountNumber: z.string().regex(/^\d{16}$/, 'Hedef hesap numarası 16 haneli olmalı'),
  amount: amountSchema,
  description: z.string().trim().max(500, 'Açıklama en fazla 500 karakter olabilir').optional(),
});

export const transactionTypeSchema = z.enum(['DEPOSIT', 'WITHDRAWAL', 'TRANSFER']);
export const transactionStatusSchema = z.enum(['PENDING', 'COMPLETED', 'FAILED']);

export const publicTransactionSchema = z.object({
  id: z.uuid(),
  referenceNo: z.string(),
  type: transactionTypeSchema,
  status: transactionStatusSchema,
  amount: z.string().regex(/^\d{1,15}\.\d{2}$/),
  currency: z.enum(['TRY', 'USD', 'EUR']),
  sourceAccountId: z.uuid().nullable(),
  targetAccountId: z.uuid().nullable(),
  description: z.string().nullable(),
  failureReason: z.string().nullable(),
  createdAt: z.iso.datetime(),
  completedAt: z.iso.datetime().nullable(),
});

export const publicTransactionDetailSchema = z.object({
  id: z.uuid(),
  referenceNo: z.string(),
  type: transactionTypeSchema,
  status: transactionStatusSchema,
  amount: z.string().regex(/^\d{1,15}\.\d{2}$/),
  currency: z.enum(['TRY', 'USD', 'EUR']),
  sourceAccount: z.object({ accountNumber: z.string() }).nullable(),
  targetAccount: z.object({ accountNumber: z.string() }).nullable(),
  ledgerEntries: z.array(
    z.object({
      accountNumber: z.string(),
      direction: z.enum(['CREDIT', 'DEBIT']),
      amount: z.string(),
      balanceAfter: z.string().nullable(),
      createdAt: z.iso.datetime(),
    }),
  ),
  description: z.string().nullable(),
  failureReason: z.string().nullable(),
  createdAt: z.iso.datetime(),
  completedAt: z.iso.datetime().nullable(),
});

export type PublicTransaction = z.infer<typeof publicTransactionSchema>;
export type PublicTransactionDetail = z.infer<typeof publicTransactionDetailSchema>;
export type CreateTransferInput = z.infer<typeof createTransferSchema>;

export const createDepositSchema = moneyOperationSchema;
export const createWithdrawalSchema = moneyOperationSchema;

export type CreateMoneyOperationInput = z.infer<typeof moneyOperationSchema>;

export const transactionIdParamsSchema = z.object({
  id: z.uuid('Geçersiz işlem kimliği'),
});
