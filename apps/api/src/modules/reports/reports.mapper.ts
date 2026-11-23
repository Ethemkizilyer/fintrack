import type { Prisma } from '@/generated/prisma/client';
import type { Currency, TransactionStatus, TransactionType } from '@/generated/prisma/enums';
import { formatAmount, toDecimal } from '@/utils/money';

export type ReportSummaryRecord = {
  currency: Currency;
  totalCredits: string;
  totalDebits: string;
  net: string;
};

export type PeriodicReportRecord = {
  periodStart: Date;
  currency: Currency;
  totalCredits: string;
  totalDebits: string;
  transactionCount: number;
};

export type TransactionStatsSummaryRecord = {
  totalTransactions: number;
  completedTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
  successRate: number;
};

export type TransactionStatsGroupRecord = {
  type: TransactionType;
  status: TransactionStatus;
  count: number;
  totalAmount: string;
};

export type FailureReasonStatsRecord = {
  reason: string;
  count: number;
};

export function toPublicReportSummary(record: ReportSummaryRecord) {
  return {
    currency: record.currency,
    totalCredits: formatAmount(toDecimal(record.totalCredits)),
    totalDebits: formatAmount(toDecimal(record.totalDebits)),
    net: formatAmount(toDecimal(record.net)),
  };
}

export function toPublicPeriodicReport(record: PeriodicReportRecord) {
  return {
    periodStart: record.periodStart.toISOString(),
    currency: record.currency,
    totalCredits: formatAmount(toDecimal(record.totalCredits)),
    totalDebits: formatAmount(toDecimal(record.totalDebits)),
    transactionCount: record.transactionCount,
  };
}

export type StatementMovementRecord = Prisma.LedgerEntryGetPayload<{
  include: {
    transaction: {
      select: {
        referenceNo: true;
        type: true;
        status: true;
        description: true;
      };
    };
  };
}>;

export type AccountStatementRecord = {
  accountId: string;
  currency: Currency;
  from: Date;
  to: Date;
  openingBalance: Prisma.Decimal;
  movements: StatementMovementRecord[];
  closingBalance: Prisma.Decimal;
};

export function toPublicAccountStatement(record: AccountStatementRecord) {
  return {
    accountId: record.accountId,
    currency: record.currency,
    from: record.from.toISOString(),
    to: record.to.toISOString(),
    openingBalance: formatAmount(record.openingBalance),
    movements: record.movements.map((movement) => ({
      id: movement.id,
      transactionId: movement.transactionId,
      referenceNo: movement.transaction.referenceNo,
      type: movement.transaction.type,
      status: movement.transaction.status,
      direction: movement.direction,
      amount: formatAmount(movement.amount),
      balanceAfter: formatAmount(movement.balanceAfter),
      description: movement.transaction.description,
      createdAt: movement.createdAt.toISOString(),
    })),
    closingBalance: formatAmount(record.closingBalance),
  };
}

export function toPublicTransactionStats(
  summary: TransactionStatsSummaryRecord,
  groups: TransactionStatsGroupRecord[],
  failures: FailureReasonStatsRecord[],
  from: Date,
  to: Date,
) {
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    totalTransactions: summary.totalTransactions,
    completedTransactions: summary.completedTransactions,
    failedTransactions: summary.failedTransactions,
    pendingTransactions: summary.pendingTransactions,
    successRate: summary.successRate,
    byTypeAndStatus: groups.map((group) => ({
      type: group.type,
      status: group.status,
      count: group.count,
      totalAmount: formatAmount(toDecimal(group.totalAmount)),
    })),
    failuresByReason: failures.map((failure) => ({
      reason: failure.reason,
      count: failure.count,
    })),
  };
}
