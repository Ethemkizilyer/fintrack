import type { Request, Response } from 'express';
import { AppError } from '@/utils/app-error';
import * as reportsService from './reports.service';
import { reportPeriodicQuerySchema, reportSummaryQuerySchema } from './reports.schema';

export async function getSummary(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized('Authentication required');

  const query = reportSummaryQuerySchema.parse(req.query);
  const data = await reportsService.getSummary(req.user, query);

  res.json({ data });
}

export async function getPeriodic(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized('Authentication required');

  const query = reportPeriodicQuerySchema.parse(req.query);
  const data = await reportsService.getPeriodic(req.user, query);

  res.json({ data });
}
