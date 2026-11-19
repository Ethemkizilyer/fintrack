import { z } from 'zod';
import { isValidNationalId } from '@/utils/national-id';

export const createCustomerSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  firstName: z.string().trim().min(2).max(50),
  lastName: z.string().trim().min(2).max(50),
  nationalId: z
    .string()
    .regex(/^\d{11}$/, 'National ID must be 11 digits')
    .refine(isValidNationalId, 'Invalid national ID'),
  phone: z.string().trim().min(7).max(20),
});

export const updateCustomerSchema = z.object({
  firstName: z.string().trim().min(2).max(50).optional(),
  lastName: z.string().trim().min(2).max(50).optional(),
  phone: z.string().trim().min(7).max(20).optional(),
  status: z.enum(['ACTIVE', 'PASSIVE']).optional(),
});

export const customerIdParamsSchema = z.object({
  id: z.uuid(),
});

export const listCustomersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).optional(),
  status: z.enum(['ACTIVE', 'PASSIVE']).optional(),
  sort: z.enum(['createdAt', 'lastName']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;
