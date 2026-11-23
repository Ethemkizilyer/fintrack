import { Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
import * as reportsController from './reports.controller';

export const reportsRouter = Router();

reportsRouter.get('/summary', authenticate, reportsController.getSummary);
reportsRouter.get('/periodic', authenticate, reportsController.getPeriodic);
reportsRouter.get('/accounts/:id/statement', authenticate, reportsController.getStatement);
reportsRouter.get('/transaction-stats', authenticate, reportsController.getTransactionStats);
