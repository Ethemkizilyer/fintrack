import type { Prisma } from '@/generated/prisma/client';
import type { Currency } from '@/generated/prisma/enums';
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
