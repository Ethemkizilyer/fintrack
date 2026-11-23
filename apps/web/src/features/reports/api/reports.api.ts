import type {
  AccountStatement,
  ApiSuccess,
  PeriodicReportItem,
  ReportPeriodicQuery,
  ReportSummary,
  ReportSummaryQuery,
  ReportStatementQuery,
  ReportTransactionStatsQuery,
  TransactionStats,
} from '@fintrack/shared';
import { apiClient } from '@/lib/api-client';

export async function fetchReportSummary(query: ReportSummaryQuery) {
  const { data } = await apiClient.get<ApiSuccess<ReportSummary[]>>('/reports/summary', {
    params: query,
  });
  return data.data;
}

export async function fetchPeriodicReport(query: ReportPeriodicQuery) {
  const { data } = await apiClient.get<ApiSuccess<PeriodicReportItem[]>>('/reports/periodic', {
    params: query,
  });
  return data.data;
}

export async function fetchTransactionStats(query: ReportTransactionStatsQuery) {
  const { data } = await apiClient.get<ApiSuccess<TransactionStats>>('/reports/transaction-stats', {
    params: query,
  });
  return data.data;
}

export async function fetchAccountStatement(accountId: string, query: ReportStatementQuery) {
  const { data } = await apiClient.get<ApiSuccess<AccountStatement>>(
    `/reports/accounts/${accountId}/statement`,
    { params: query },
  );
  return data.data;
}
