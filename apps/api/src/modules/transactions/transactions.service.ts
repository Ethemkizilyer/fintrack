import { createHash } from 'node:crypto';
import { Prisma } from '@/generated/prisma/client';
import type { TransactionModel } from '@/generated/prisma/models';
import type { Currency, TransactionType } from '@/generated/prisma/enums';
import { prisma } from '@/lib/prisma';
import type { Actor } from '@/types/actor';
import { AppError } from '@/utils/app-error';
import { toDecimal } from '@/utils/money';
import type { CreateMoneyOperationInput } from './transactions.schema';
import { runMoneyTransaction } from './money-movement';

type MoneyOperationType = Extract<TransactionType, 'DEPOSIT' | 'WITHDRAWAL'>;

function hashRequest(type: MoneyOperationType, input: CreateMoneyOperationInput): string {
  const canonicalRequest = {
    type,
    accountId: input.accountId,
    amount: input.amount,
    description: input.description ?? null,
  };

  return createHash('sha256').update(JSON.stringify(canonicalRequest)).digest('hex');
}

function assertSameRequest(transaction: TransactionModel, requestHash: string): void {
  if (transaction.requestHash !== requestHash) {
    throw new AppError(
      409,
      'IDEMPOTENCY_KEY_REUSED',
      'Idempotency key was already used with a different request',
    );
  }
}

async function findByIdempotencyKey(
  initiatedById: string,
  idempotencyKey: string,
): Promise<TransactionModel | null> {
  return prisma.transaction.findUnique({
    where: {
      initiatedById_idempotencyKey: { initiatedById, idempotencyKey },
    },
  });
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

async function createPendingTransaction(data: {
  type: MoneyOperationType;
  amount: Prisma.Decimal;
  currency: Currency;
  accountId: string;
  description?: string;
  idempotencyKey: string;
  requestHash: string;
  initiatedById: string;
}): Promise<{ transaction: TransactionModel; isReplay: boolean }> {
  try {
    const transaction = await prisma.transaction.create({
      data: {
        type: data.type,
        status: 'PENDING',
        amount: data.amount,
        currency: data.currency,
        ...(data.type === 'DEPOSIT'
          ? { targetAccountId: data.accountId }
          : { sourceAccountId: data.accountId }),
        ...(data.description === undefined ? {} : { description: data.description }),
        idempotencyKey: data.idempotencyKey,
        requestHash: data.requestHash,
        initiatedById: data.initiatedById,
      },
    });

    return { transaction, isReplay: false };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;

    // Another identical request may have inserted this key first.
    const existing = await findByIdempotencyKey(data.initiatedById, data.idempotencyKey);
    if (!existing) throw error;

    assertSameRequest(existing, data.requestHash);
    return { transaction: existing, isReplay: true };
  }
}

async function createMoneyOperation(
  actor: Actor,
  input: CreateMoneyOperationInput,
  idempotencyKey: string,
  type: MoneyOperationType,
): Promise<{ transaction: TransactionModel; isReplay: boolean }> {
  const requestHash = hashRequest(type, input);

  const existing = await findByIdempotencyKey(actor.id, idempotencyKey);
  if (existing) {
    assertSameRequest(existing, requestHash);
    return { transaction: existing, isReplay: true };
  }

  const account = await prisma.account.findUnique({
    where: { id: input.accountId },
  });

  if (!account || (actor.role !== 'ADMIN' && account.customerId !== actor.customerId)) {
    throw AppError.notFound('Account not found');
  }

  const amount = toDecimal(input.amount);
  const pendingResult = await createPendingTransaction({
    type,
    amount,
    currency: account.currency,
    accountId: account.id,
    ...(input.description === undefined ? {} : { description: input.description }),
    idempotencyKey,
    requestHash,
    initiatedById: actor.id,
  });

  if (pendingResult.isReplay) return pendingResult;

  const direction = type === 'DEPOSIT' ? 'CREDIT' : 'DEBIT';
  const transaction = await runMoneyTransaction(pendingResult.transaction, [
    { accountId: account.id, direction, amount },
  ]);

  return { transaction, isReplay: false };
}

export async function createDeposit(
  actor: Actor,
  input: CreateMoneyOperationInput,
  idempotencyKey: string,
) {
  return createMoneyOperation(actor, input, idempotencyKey, 'DEPOSIT');
}

export async function createWithdrawal(
  actor: Actor,
  input: CreateMoneyOperationInput,
  idempotencyKey: string,
) {
  return createMoneyOperation(actor, input, idempotencyKey, 'WITHDRAWAL');
}
