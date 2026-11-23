import type { Request, Response } from 'express';
import { AppError } from '@/utils/app-error';
import * as reportsService from './reports.service';
import {
  reportPeriodicQuerySchema,
  reportStatementParamsSchema,
  reportStatementQuerySchema,
  reportSummaryQuerySchema,
  reportTransactionStatsQuerySchema,
} from './reports.schema';

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

export async function getStatement(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized('Authentication required');

  const { id } = reportStatementParamsSchema.parse(req.params);
  const query = reportStatementQuerySchema.parse(req.query);
  const data = await reportsService.getAccountStatement(req.user, id, query);

  res.json({ data });
}

export async function getTransactionStats(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized('Authentication required');

  const query = reportTransactionStatsQuerySchema.parse(req.query);
  const data = await reportsService.getTransactionStats(req.user, query);

  res.json({ data });
}
