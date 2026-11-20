import { createHash } from 'node:crypto';
import { Prisma } from '@/generated/prisma/client';
import type { TransactionModel } from '@/generated/prisma/models';
import type { Currency, TransactionType } from '@/generated/prisma/enums';
import { prisma } from '@/lib/prisma';
import type { Actor } from '@/types/actor';
import { AppError } from '@/utils/app-error';
import { toDecimal } from '@/utils/money';
import type { CreateMoneyOperationInput, CreateTransferInput } from './transactions.schema';
import { runMoneyTransaction } from './money-movement';

type MoneyOperationType = Extract<TransactionType, 'DEPOSIT' | 'WITHDRAWAL'>;
type HashValue = string | null;

type PendingTransactionInput = {
  type: TransactionType;
  amount: Prisma.Decimal;
  currency: Currency;
  sourceAccountId?: string;
  targetAccountId?: string;
  description?: string;
  idempotencyKey: string;
  requestHash: string;
  initiatedById: string;
};

function hashRequest(type: TransactionType, input: Record<string, HashValue>): string {
  return createHash('sha256')
    .update(JSON.stringify({ type, ...input }))
    .digest('hex');
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

async function createPendingTransaction(
  input: PendingTransactionInput,
): Promise<{ transaction: TransactionModel; isReplay: boolean }> {
  try {
    const transaction = await prisma.transaction.create({
      data: {
        type: input.type,
        status: 'PENDING',
        amount: input.amount,
        currency: input.currency,
        sourceAccountId: input.sourceAccountId ?? null,
        targetAccountId: input.targetAccountId ?? null,
        ...(input.description === undefined ? {} : { description: input.description }),
        idempotencyKey: input.idempotencyKey,
        requestHash: input.requestHash,
        initiatedById: input.initiatedById,
      },
    });

    return { transaction, isReplay: false };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;

    // A concurrent request may have created the same idempotency key first.
    const existing = await findByIdempotencyKey(input.initiatedById, input.idempotencyKey);
    if (!existing) throw error;

    assertSameRequest(existing, input.requestHash);
    return { transaction: existing, isReplay: true };
  }
}

async function createMoneyOperation(
  actor: Actor,
  input: CreateMoneyOperationInput,
  idempotencyKey: string,
  type: MoneyOperationType,
): Promise<{ transaction: TransactionModel; isReplay: boolean }> {
  const requestHash = hashRequest(type, {
    accountId: input.accountId,
    amount: input.amount,
    description: input.description ?? null,
  });

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
    ...(type === 'DEPOSIT' ? { targetAccountId: account.id } : { sourceAccountId: account.id }),
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

export async function createTransfer(
  actor: Actor,
  input: CreateTransferInput,
  idempotencyKey: string,
): Promise<{ transaction: TransactionModel; isReplay: boolean }> {
  const requestHash = hashRequest('TRANSFER', {
    sourceAccountId: input.sourceAccountId,
    targetAccountNumber: input.targetAccountNumber,
    amount: input.amount,
    description: input.description ?? null,
  });

  const existing = await findByIdempotencyKey(actor.id, idempotencyKey);
  if (existing) {
    assertSameRequest(existing, requestHash);
    return { transaction: existing, isReplay: true };
  }

  const source = await prisma.account.findUnique({
    where: { id: input.sourceAccountId },
  });

  if (!source || (actor.role !== 'ADMIN' && source.customerId !== actor.customerId)) {
    throw AppError.notFound('Source account not found');
  }

  const target = await prisma.account.findUnique({
    where: { accountNumber: input.targetAccountNumber },
  });

  if (!target) throw AppError.notFound('Target account not found');

  if (source.id === target.id) {
    throw AppError.badRequest('Source and target accounts must differ');
  }

  const amount = toDecimal(input.amount);
  const pendingResult = await createPendingTransaction({
    type: 'TRANSFER',
    amount,
    currency: source.currency,
    sourceAccountId: source.id,
    targetAccountId: target.id,
    ...(input.description === undefined ? {} : { description: input.description }),
    idempotencyKey,
    requestHash,
    initiatedById: actor.id,
  });

  if (pendingResult.isReplay) return pendingResult;

  const transaction = await runMoneyTransaction(pendingResult.transaction, [
    { accountId: source.id, direction: 'DEBIT', amount },
    { accountId: target.id, direction: 'CREDIT', amount },
  ]);

  return { transaction, isReplay: false };
}
