import { randomInt } from 'node:crypto';
import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import type { Actor } from '@/types/actor';
import { AppError } from '@/utils/app-error';
import { toPublicAccount } from './accounts.mapper';
import type {
  CreateAccountInput,
  ListAccountsQuery,
  UpdateAccountStatusInput,
} from './accounts.schema';

const MAX_ACCOUNT_NUMBER_ATTEMPTS = 3;

function generateAccountNumber(): string {
  const part = () => String(randomInt(10_000_000, 100_000_000));
  return part() + part();
}

export async function createAccount(actor: Actor, input: CreateAccountInput) {
  const customerId = actor.role === 'ADMIN' ? input.customerId : actor.customerId;
  if (!customerId) {
    throw AppError.badRequest('customerId is required');
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw AppError.notFound('Customer not found');
  if (customer.status !== 'ACTIVE') {
    throw AppError.businessRule('CUSTOMER_INACTIVE', 'Customer is not active');
  }

  for (let attempt = 1; attempt <= MAX_ACCOUNT_NUMBER_ATTEMPTS; attempt += 1) {
    try {
      const account = await prisma.account.create({
        data: { customerId, accountNumber: generateAccountNumber(), currency: input.currency },
      });
      return toPublicAccount(account);
    } catch (error) {
      const isUniqueViolation =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
      if (!isUniqueViolation || attempt === MAX_ACCOUNT_NUMBER_ATTEMPTS) throw error;
    }
  }

  throw new Error('Account number generation failed');
}

export async function listAccounts(actor: Actor, query: ListAccountsQuery) {
  const where: Prisma.AccountWhereInput = {
    ...(actor.role === 'ADMIN'
      ? { ...(query.customerId ? { customerId: query.customerId } : {}) }
      : { customerId: actor.customerId ?? { in: [] } }),
    ...(query.status ? { status: query.status } : {}),
  };

  const accounts = await prisma.account.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return accounts.map(toPublicAccount);
}

export async function getAccountById(actor: Actor, id: string) {
  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) throw AppError.notFound('Account not found');
  if (actor.role !== 'ADMIN' && account.customerId !== actor.customerId) {
    throw AppError.notFound('Account not found');
  }
  return toPublicAccount(account);
}

export async function updateAccountStatus(id: string, input: UpdateAccountStatusInput) {
  const existing = await prisma.account.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Account not found');

  const account = await prisma.account.update({
    where: { id },
    data: { status: input.status },
  });
  return toPublicAccount(account);
}
