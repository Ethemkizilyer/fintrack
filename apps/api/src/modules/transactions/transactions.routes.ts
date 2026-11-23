import { Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
import * as transactionsController from './transactions.controller';
import { moneyOperationRateLimiter } from '@/middlewares/rate-limits';

export const transactionsRouter = Router();

transactionsRouter.post(
  '/deposits',
  authenticate,
  moneyOperationRateLimiter,
  transactionsController.deposit,
);
transactionsRouter.post(
  '/withdrawals',
  authenticate,
  moneyOperationRateLimiter,
  transactionsController.withdrawal,
);
transactionsRouter.post(
  '/transfers',
  authenticate,
  moneyOperationRateLimiter,
  transactionsController.transfer,
);
transactionsRouter.get('/:id', authenticate, transactionsController.getById);
