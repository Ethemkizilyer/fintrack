import { Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
import { authorize } from '@/middlewares/authorize';
import * as accountsController from './accounts.controller';

export const accountsRouter = Router();

accountsRouter.post('/', authenticate, accountsController.create);
accountsRouter.get('/', authenticate, accountsController.list);
accountsRouter.get('/:id', authenticate, accountsController.getById);
accountsRouter.patch(
  '/:id/status',
  authenticate,
  authorize('ADMIN'),
  accountsController.updateStatus,
);
