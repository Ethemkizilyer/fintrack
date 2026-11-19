import type { Role } from '@/generated/prisma/enums';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
        customerId: string | null;
      };
    }
  }
}

export {};
