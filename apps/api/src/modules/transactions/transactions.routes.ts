import { Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
import * as transactionsController from './transactions.controller';

export const transactionsRouter = Router();

transactionsRouter.post('/deposits', authenticate, transactionsController.deposit);
transactionsRouter.post('/withdrawals', authenticate, transactionsController.withdrawal);
