import { z } from 'zod';
import { isValidNationalId } from '../utils/national-id';

export const customerStatusSchema = z.enum(['ACTIVE', 'PASSIVE']);

export const publicCustomerSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  firstName: z.string(),
  lastName: z.string(),
  nationalId: z.string(),
  phone: z.string(),
  status: customerStatusSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  accountCount: z.number().int().nonnegative().optional(),
});

export const createCustomerSchema = z.object({
  email: z.email('Geçerli bir e-posta girin'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalı'),
  firstName: z.string().trim().min(2, 'Ad en az 2 karakter olmalı').max(50),
  lastName: z.string().trim().min(2, 'Soyad en az 2 karakter olmalı').max(50),
  nationalId: z
    .string()
    .regex(/^\d{11}$/, 'T.C. kimlik numarası 11 haneli olmalı')
    .refine(isValidNationalId, 'Geçersiz T.C. kimlik numarası'),
  phone: z.string().trim().min(7, 'Geçerli bir telefon girin').max(20),
});

export const updateCustomerSchema = z.object({
  firstName: z.string().trim().min(2, 'Ad en az 2 karakter olmalı').max(50).optional(),
  lastName: z.string().trim().min(2, 'Soyad en az 2 karakter olmalı').max(50).optional(),
  phone: z.string().trim().min(7, 'Geçerli bir telefon girin').max(20).optional(),
  status: z.enum(['ACTIVE', 'PASSIVE']).optional(),
});

export const customerIdParamsSchema = z.object({
  id: z.uuid('Geçersiz müşteri kimliği'),
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
export type PublicCustomer = z.infer<typeof publicCustomerSchema>;
