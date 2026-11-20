import { z } from 'zod';
import { amountSchema } from '@/utils/money';

const moneyOperationSchema = z.object({
  accountId: z.uuid('Geçersiz hesap kimliği'),
  amount: amountSchema,
  description: z.string().trim().max(500, 'Açıklama en fazla 500 karakter olabilir').optional(),
});

export const createDepositSchema = moneyOperationSchema;
export const createWithdrawalSchema = moneyOperationSchema;

export const idempotencyKeySchema = z.uuid('Idempotency-Key geçerli bir UUID olmalı');

export type CreateMoneyOperationInput = z.infer<typeof moneyOperationSchema>;
