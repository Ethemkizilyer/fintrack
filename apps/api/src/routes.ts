import { Router } from 'express';
import { healthRouter } from '@/modules/health/health.routes';
import { authRouter } from './modules/auth/auth.routes';
import { customersRouter } from './modules/customers/customers.routes';

export const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/customers', customersRouter);
