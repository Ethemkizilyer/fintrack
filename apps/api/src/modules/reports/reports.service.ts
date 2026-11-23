import type { Actor } from '@/types/actor';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/utils/app-error';
import {
  toPublicAccountStatement,
  toPublicPeriodicReport,
  toPublicReportSummary,
  toPublicTransactionStats,
  type AccountStatementRecord,
  type FailureReasonStatsRecord,
  type PeriodicReportRecord,
  type ReportSummaryRecord,
  type TransactionStatsGroupRecord,
  type TransactionStatsSummaryRecord,
} from './reports.mapper';
import type {
  ReportPeriodicQuery,
  ReportSummaryQuery,
  ReportStatementQuery,
  ReportTransactionStatsQuery,
} from './reports.schema';
import { Prisma } from '@/generated/prisma/client';

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

export async function getAccountStatement(
  actor: Actor,
  accountId: string,
  query: ReportStatementQuery,
) {
  await resolveReportScope(actor, accountId);

  const from = new Date(query.from);
  const to = new Date(query.to);

  return prisma.$transaction(
    async (tx) => {
      const account = await tx.account.findUnique({
        where: { id: accountId },
        select: { id: true, currency: true },
      });

      if (!account) throw AppError.notFound('Account not found');

      const openingEntry = await tx.ledgerEntry.findFirst({
        where: { accountId, createdAt: { lt: from } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: { balanceAfter: true },
      });

      const movements = await tx.ledgerEntry.findMany({
        where: { accountId, createdAt: { gte: from, lt: to } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        include: {
          transaction: {
            select: {
              referenceNo: true,
              type: true,
              status: true,
              description: true,
            },
          },
        },
      });

      const closingEntry = await tx.ledgerEntry.findFirst({
        where: { accountId, createdAt: { lt: to } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: { balanceAfter: true },
      });

      const openingBalance = openingEntry?.balanceAfter ?? new Prisma.Decimal('0.00');

      const statement: AccountStatementRecord = {
        accountId: account.id,
        currency: account.currency,
        from,
        to,
        openingBalance,
        movements,
        closingBalance: closingEntry?.balanceAfter ?? openingBalance,
      };

      return toPublicAccountStatement(statement);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
}

export async function getTransactionStats(actor: Actor, query: ReportTransactionStatsQuery) {
  const { customerId } = await resolveReportScope(actor);
  const from = new Date(query.from);
  const to = new Date(query.to);

  return prisma.$transaction(
    async (tx) => {
      const summaryRows = await tx.$queryRaw<TransactionStatsSummaryRecord[]>`
        SELECT
          COUNT(*)::int AS "totalTransactions",
          COUNT(*) FILTER (WHERE t.status = 'COMPLETED')::int AS "completedTransactions",
          COUNT(*) FILTER (WHERE t.status = 'FAILED')::int AS "failedTransactions",
          COUNT(*) FILTER (WHERE t.status = 'PENDING')::int AS "pendingTransactions",
          COALESCE(
            ROUND(
              100.0 * COUNT(*) FILTER (WHERE t.status = 'COMPLETED')
              / NULLIF(
                  COUNT(*) FILTER (WHERE t.status IN ('COMPLETED', 'FAILED')),
                  0
                ),
              2
            ),
            0
          )::float8 AS "successRate"
        FROM transactions AS t
        WHERE t.created_at >= ${from}::timestamptz
          AND t.created_at < ${to}::timestamptz
          AND (
            ${customerId}::uuid IS NULL
            OR EXISTS (
              SELECT 1
              FROM accounts AS owned
              WHERE owned.customer_id = ${customerId}::uuid
                AND owned.id IN (t.source_account_id, t.target_account_id)
            )
          )
      `;

      const groups = await tx.$queryRaw<TransactionStatsGroupRecord[]>`
        SELECT
          t.type::text AS type,
          t.status::text AS status,
          COUNT(*)::int AS "count",
          COALESCE(SUM(t.amount), 0)::text AS "totalAmount"
        FROM transactions AS t
        WHERE t.created_at >= ${from}::timestamptz
          AND t.created_at < ${to}::timestamptz
          AND (
            ${customerId}::uuid IS NULL
            OR EXISTS (
              SELECT 1
              FROM accounts AS owned
              WHERE owned.customer_id = ${customerId}::uuid
                AND owned.id IN (t.source_account_id, t.target_account_id)
            )
          )
        GROUP BY t.type, t.status
        ORDER BY t.type, t.status
      `;

      const failures = await tx.$queryRaw<FailureReasonStatsRecord[]>`
        SELECT
          t.failure_reason AS reason,
          COUNT(*)::int AS "count"
        FROM transactions AS t
        WHERE t.created_at >= ${from}::timestamptz
          AND t.created_at < ${to}::timestamptz
          AND t.status = 'FAILED'
          AND t.failure_reason IS NOT NULL
          AND (
            ${customerId}::uuid IS NULL
            OR EXISTS (
              SELECT 1
              FROM accounts AS owned
              WHERE owned.customer_id = ${customerId}::uuid
                AND owned.id IN (t.source_account_id, t.target_account_id)
            )
          )
        GROUP BY t.failure_reason
        ORDER BY COUNT(*) DESC, t.failure_reason
      `;

      const summary = summaryRows[0] ?? {
        totalTransactions: 0,
        completedTransactions: 0,
        failedTransactions: 0,
        pendingTransactions: 0,
        successRate: 0,
      };

      return toPublicTransactionStats(summary, groups, failures, from, to);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
}
