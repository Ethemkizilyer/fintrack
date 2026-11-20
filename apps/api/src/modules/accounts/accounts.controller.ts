import type { Request, Response } from 'express';
import { AppError } from '@/utils/app-error';
import * as accountsService from './accounts.service';
import {
  accountIdParamsSchema,
  accountTransactionsQuerySchema,
  createAccountSchema,
  listAccountsQuerySchema,
  updateAccountStatusSchema,
} from './accounts.schema';

export async function create(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized('Authentication required');
  const input = createAccountSchema.parse(req.body);
  res.status(201).json({ data: await accountsService.createAccount(req.user, input) });
}

export async function list(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized('Authentication required');
  const query = listAccountsQuerySchema.parse(req.query);
  res.json({ data: await accountsService.listAccounts(req.user, query) });
}

export async function getById(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized('Authentication required');
  const { id } = accountIdParamsSchema.parse(req.params);
  res.json({ data: await accountsService.getAccountById(req.user, id) });
}

export async function updateStatus(req: Request, res: Response) {
  const { id } = accountIdParamsSchema.parse(req.params);
  const input = updateAccountStatusSchema.parse(req.body);
  res.json({ data: await accountsService.updateAccountStatus(id, input) });
}

export async function listTransactions(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized('Authentication required');

  const { id } = accountIdParamsSchema.parse(req.params);
  const query = accountTransactionsQuerySchema.parse(req.query);
  const result = await accountsService.listAccountTransactions(req.user, id, query);

  res.json({
    data: result.data,
    meta: result.meta,
  });
}
