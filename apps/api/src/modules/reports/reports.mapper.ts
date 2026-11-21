import type { Currency } from '@/generated/prisma/enums';
import { formatAmount, toDecimal } from '@/utils/money';

export type ReportSummaryRecord = {
  currency: Currency;
  totalCredits: string;
  totalDebits: string;
  net: string;
};

export function toPublicReportSummary(record: ReportSummaryRecord) {
  return {
    currency: record.currency,
    totalCredits: formatAmount(toDecimal(record.totalCredits)),
    totalDebits: formatAmount(toDecimal(record.totalDebits)),
    net: formatAmount(toDecimal(record.net)),
  };
}
