import type { Role } from '@/generated/prisma/enums';

export type Actor = {
  id: string;
  role: Role;
  customerId: string | null;
};
