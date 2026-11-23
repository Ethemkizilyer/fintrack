import { z } from 'zod';
import {
  amountSchema,
  createDepositSchema,
  createTransferSchema,
  createWithdrawalSchema,
} from '@fintrack/shared';
import { normalizeLocalizedAmount } from '@/lib/localized-input';

const localizedAmountSchema = z.string().transform(normalizeLocalizedAmount).pipe(amountSchema);

export const localizedDepositSchema = createDepositSchema.extend({
  amount: localizedAmountSchema,
});

export const localizedWithdrawalSchema = createWithdrawalSchema.extend({
  amount: localizedAmountSchema,
});

export const localizedTransferSchema = createTransferSchema.extend({
  amount: localizedAmountSchema,
});
