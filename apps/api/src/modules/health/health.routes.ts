import { Router } from 'express';
import * as healthController from '@/modules/health/health.controller';

export const healthRouter = Router();

healthRouter.get('/', healthController.check);
