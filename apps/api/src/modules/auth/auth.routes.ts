import { Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
import { authRateLimiter } from '@/middlewares/rate-limits';
import * as authController from './auth.controller';

export const authRouter = Router();

authRouter.post('/login', authRateLimiter, authController.login);
authRouter.post('/refresh', authController.refresh);
authRouter.post('/logout', authController.logout);
authRouter.get('/me', authenticate, authController.me);
