import type { Request, Response } from 'express';
import * as exchangeRatesService from './exchange-rates.service';

export async function getLatest(_req: Request, res: Response) {
  const data = await exchangeRatesService.getExchangeRates();
  res.json({ data });
}
