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
import { toDecimal } from '@/utils/money';
import { toPublicAccountTransaction } from './account-transactions.mapper';
import type { AccountTransactionsQuery } from './accounts.schema';

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

  if (actor.role === 'ADMIN') {
    const accounts = await prisma.account.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    return accounts.map((account) => ({
      ...toPublicAccount(account),
      owner: account.customer,
    }));
  }

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

export async function listAccountTransactions(
  actor: Actor,
  accountId: string,
  query: AccountTransactionsQuery,
) {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { id: true, customerId: true },
  });

  if (!account || (actor.role !== 'ADMIN' && account.customerId !== actor.customerId)) {
    throw AppError.notFound('Account not found');
  }

  const where: Prisma.TransactionWhereInput = {
    OR: [{ sourceAccountId: accountId }, { targetAccountId: accountId }],
    ...(query.type ? { type: query.type } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.from || query.to
      ? {
          createdAt: {
            ...(query.from ? { gte: new Date(query.from) } : {}),
            ...(query.to ? { lt: new Date(query.to) } : {}),
          },
        }
      : {}),
    ...(query.minAmount || query.maxAmount
      ? {
          amount: {
            ...(query.minAmount ? { gte: toDecimal(query.minAmount) } : {}),
            ...(query.maxAmount ? { lte: toDecimal(query.maxAmount) } : {}),
          },
        }
      : {}),
  };

  const orderBy: Prisma.TransactionOrderByWithRelationInput[] = [
    query.sort === 'amount' ? { amount: query.order } : { createdAt: query.order },
    { id: query.order },
  ];

  const [transactions, total] = await prisma.$transaction(
    [
      prisma.transaction.findMany({
        where,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          ledgerEntries: {
            where: { accountId },
            select: { direction: true, balanceAfter: true },
          },
        },
      }),
      prisma.transaction.count({ where }),
    ],
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );

  return {
    data: transactions.map((transaction) => toPublicAccountTransaction(transaction, accountId)),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}
