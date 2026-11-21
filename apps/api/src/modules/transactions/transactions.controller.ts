import type { Request, Response } from 'express';
import { AppError } from '@/utils/app-error';
import * as transactionsService from './transactions.service';
import {
  createDepositSchema,
  createTransferSchema,
  createWithdrawalSchema,
  transactionIdParamsSchema,
} from './transactions.schema';
import { idempotencyKeySchema } from './idempotency';
import { toPublicTransaction } from './transactions.mapper';

function getRequestContext(req: Request) {
  if (!req.user) throw AppError.unauthorized('Authentication required');

  const idempotencyKey = idempotencyKeySchema.parse(req.get('Idempotency-Key'));

  return { actor: req.user, idempotencyKey };
}

export async function deposit(req: Request, res: Response) {
  const { actor, idempotencyKey } = getRequestContext(req);
  const input = createDepositSchema.parse(req.body);
  const result = await transactionsService.createDeposit(actor, input, idempotencyKey);

  res.status(result.isReplay ? 200 : 201).json({ data: toPublicTransaction(result.transaction) });
}

export async function withdrawal(req: Request, res: Response) {
  const { actor, idempotencyKey } = getRequestContext(req);
  const input = createWithdrawalSchema.parse(req.body);
  const result = await transactionsService.createWithdrawal(actor, input, idempotencyKey);

  res.status(result.isReplay ? 200 : 201).json({ data: toPublicTransaction(result.transaction) });
}

export async function transfer(req: Request, res: Response) {
  const { actor, idempotencyKey } = getRequestContext(req);
  const input = createTransferSchema.parse(req.body);
  const result = await transactionsService.createTransfer(actor, input, idempotencyKey);

  res.status(result.isReplay ? 200 : 201).json({ data: toPublicTransaction(result.transaction) });
}

export async function getById(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized('Authentication required');

  const { id } = transactionIdParamsSchema.parse(req.params);
  const transaction = await transactionsService.getTransactionById(req.user, id);

  res.json({ data: transaction });
}
