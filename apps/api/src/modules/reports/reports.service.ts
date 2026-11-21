import type { Actor } from '@/types/actor';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/utils/app-error';
import { toPublicReportSummary, type ReportSummaryRecord } from './reports.mapper';
import type { ReportSummaryQuery } from './reports.schema';

export async function getSummary(actor: Actor, query: ReportSummaryQuery) {
  if (actor.role !== 'ADMIN' && !actor.customerId) {
    throw AppError.notFound('Customer not found');
  }

  const accountId = query.accountId ?? null;

  if (accountId) {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true, customerId: true },
    });

    if (!account || (actor.role !== 'ADMIN' && account.customerId !== actor.customerId)) {
      throw AppError.notFound('Account not found');
    }
  }

  const customerId = actor.role === 'ADMIN' ? null : actor.customerId;
  const from = new Date(query.from);
  const to = new Date(query.to);

  const rows = await prisma.$queryRaw<ReportSummaryRecord[]>`
    SELECT
      a.currency::text AS currency,
      COALESCE(
        SUM(le.amount) FILTER (WHERE le.direction = 'CREDIT'),
        0
      )::text AS "totalCredits",
      COALESCE(
        SUM(le.amount) FILTER (WHERE le.direction = 'DEBIT'),
        0
      )::text AS "totalDebits",
      (
        COALESCE(
          SUM(le.amount) FILTER (WHERE le.direction = 'CREDIT'),
          0
        )
        -
        COALESCE(
          SUM(le.amount) FILTER (WHERE le.direction = 'DEBIT'),
          0
        )
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
