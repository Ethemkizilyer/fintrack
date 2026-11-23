import { Router } from 'express';
import { authenticate } from '@/middlewares/authenticate';
import * as exchangeRatesController from './exchange-rates.controller';

export const exchangeRatesRouter = Router();

exchangeRatesRouter.get('/', authenticate, exchangeRatesController.getLatest);
