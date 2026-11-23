import { z } from 'zod';

export const roleSchema = z.enum(['ADMIN', 'CUSTOMER']);

export const publicUserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  role: roleSchema,
  customer: z
    .object({
      id: z.uuid(),
      firstName: z.string(),
      lastName: z.string(),
      phone: z.string(),
      status: z.enum(['ACTIVE', 'PASSIVE']),
    })
    .nullable(),
  createdAt: z.iso.datetime(),
});

export const authSessionSchema = z.object({
  accessToken: z.string().min(1),
  user: publicUserSchema,
});

export type PublicUser = z.infer<typeof publicUserSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type Role = z.infer<typeof roleSchema>;
