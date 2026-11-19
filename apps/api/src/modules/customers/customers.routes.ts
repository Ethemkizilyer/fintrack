import { Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
import { authorize } from '@/middlewares/authorize';
import * as customersController from './customers.controller';

export const customersRouter = Router();

customersRouter.post('/', authenticate, authorize('ADMIN'), customersController.create);
customersRouter.get('/', authenticate, authorize('ADMIN'), customersController.list);
customersRouter.get('/:id', authenticate, authorize('ADMIN'), customersController.getById);
customersRouter.patch('/:id', authenticate, authorize('ADMIN'), customersController.update);
