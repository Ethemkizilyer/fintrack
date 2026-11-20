import { Prisma } from '@/generated/prisma/client';
import type { TransactionModel } from '@/generated/prisma/models';
import type { Currency, TransactionType } from '@/generated/prisma/enums';
import { prisma } from '@/lib/prisma';
import type { Actor } from '@/types/actor';
import { AppError } from '@/utils/app-error';
import { toDecimal } from '@/utils/money';
import type { CreateMoneyOperationInput, CreateTransferInput } from './transactions.schema';
import { runMoneyTransaction } from './money-movement';
import { findIdempotentTransaction, hashRequest, isUniqueViolation } from './idempotency';

type MoneyOperationType = Extract<TransactionType, 'DEPOSIT' | 'WITHDRAWAL'>;

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

    const existing = await findIdempotentTransaction(
      input.initiatedById,
      input.idempotencyKey,
      input.requestHash,
    );

    if (!existing) throw error;

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

  const existing = await findIdempotentTransaction(actor.id, idempotencyKey, requestHash);
  if (existing) {
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

  const existing = await findIdempotentTransaction(actor.id, idempotencyKey, requestHash);
  if (existing) {
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
