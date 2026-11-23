import type { Actor } from '@/types/actor';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/utils/app-error';
import {
  toPublicPeriodicReport,
  toPublicReportSummary,
  type PeriodicReportRecord,
  type ReportSummaryRecord,
} from './reports.mapper';
import type { ReportPeriodicQuery, ReportSummaryQuery } from './reports.schema';

type ReportScope = {
  customerId: string | null;
  accountId: string | null;
};

async function resolveReportScope(actor: Actor, requestedAccountId?: string): Promise<ReportScope> {
  if (actor.role !== 'ADMIN' && !actor.customerId) {
    throw AppError.notFound('Customer not found');
  }

  const accountId = requestedAccountId ?? null;

  if (accountId) {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true, customerId: true },
    });

    if (!account || (actor.role !== 'ADMIN' && account.customerId !== actor.customerId)) {
      throw AppError.notFound('Account not found');
    }
  }

  return {
    customerId: actor.role === 'ADMIN' ? null : actor.customerId,
    accountId,
  };
}

export async function getSummary(actor: Actor, query: ReportSummaryQuery) {
  const { customerId, accountId } = await resolveReportScope(actor, query.accountId);
  const from = new Date(query.from);
  const to = new Date(query.to);

  const rows = await prisma.$queryRaw<ReportSummaryRecord[]>`
    SELECT
      a.currency::text AS currency,
      COALESCE(SUM(le.amount) FILTER (WHERE le.direction = 'CREDIT'), 0)::text AS "totalCredits",
      COALESCE(SUM(le.amount) FILTER (WHERE le.direction = 'DEBIT'), 0)::text AS "totalDebits",
      (
        COALESCE(SUM(le.amount) FILTER (WHERE le.direction = 'CREDIT'), 0)
        - COALESCE(SUM(le.amount) FILTER (WHERE le.direction = 'DEBIT'), 0)
      )::text AS net
    FROM accounts AS a
    LEFT JOIN ledger_entries AS le
      ON le.account_id = a.id
      AND le.created_at >= ${from}::timestamptz
      AND le.created_at < ${to}::timestamptz
    WHERE
      (${customerId}::uuid IS NULL OR a.customer_id = ${customerId}::uuid)
      AND (${accountId}::uuid IS NULL OR a.id = ${accountId}::uuid)
    GROUP BY a.currency
    ORDER BY a.currency
  `;

  return rows.map(toPublicReportSummary);
}

export async function getPeriodic(actor: Actor, query: ReportPeriodicQuery) {
  const { customerId, accountId } = await resolveReportScope(actor, query.accountId);
  const from = new Date(query.from);
  const to = new Date(query.to);

  const rows = await prisma.$queryRaw<PeriodicReportRecord[]>`
    WITH bucketed_entries AS (
      SELECT
        date_trunc(
          ${query.period},
          le.created_at AT TIME ZONE 'Europe/Istanbul'
        ) AS local_period_start,
        a.currency::text AS currency,
        le.transaction_id,
        le.direction,
        le.amount
      FROM ledger_entries AS le
      JOIN accounts AS a ON a.id = le.account_id
      WHERE le.created_at >= ${from}::timestamptz
        AND le.created_at < ${to}::timestamptz
        AND (${customerId}::uuid IS NULL OR a.customer_id = ${customerId}::uuid)
        AND (${accountId}::uuid IS NULL OR a.id = ${accountId}::uuid)
    )
    SELECT
      local_period_start AT TIME ZONE 'Europe/Istanbul' AS "periodStart",
      currency,
      COALESCE(
        SUM(amount) FILTER (WHERE direction = 'CREDIT'),
        0
      )::text AS "totalCredits",
      COALESCE(
        SUM(amount) FILTER (WHERE direction = 'DEBIT'),
        0
      )::text AS "totalDebits",
      COUNT(DISTINCT transaction_id)::int AS "transactionCount"
    FROM bucketed_entries
    GROUP BY local_period_start, currency
    ORDER BY local_period_start, currency
  `;

  return rows.map(toPublicPeriodicReport);
}
