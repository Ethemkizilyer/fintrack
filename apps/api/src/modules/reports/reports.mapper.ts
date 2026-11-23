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
