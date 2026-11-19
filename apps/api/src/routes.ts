import { Router } from 'express';
import { healthRouter } from '@/modules/health/health.routes';
import { authRouter } from './modules/auth/auth.routes';
import { customersRouter } from './modules/customers/customers.routes';
import { accountsRouter } from './modules/accounts/accounts.routes';

export const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/customers', customersRouter);
router.use('/accounts', accountsRouter);
