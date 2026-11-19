import { Router } from 'express';
import { healthRouter } from '@/modules/health/health.routes';
import { authRouter } from './modules/auth/auth.routes';

export const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
