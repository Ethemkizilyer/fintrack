import { z } from 'zod';

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
