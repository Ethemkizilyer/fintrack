'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { AccountAutocompleteField } from '@/features/accounts/components/account-autocomplete-field';
import {
  fetchAccountStatement,
  fetchPeriodicReport,
  fetchReportSummary,
  fetchTransactionStats,
} from '@/features/reports/api/reports.api';
import { reportKeys } from '@/features/reports/report.keys';
import { formatAmount } from '@/lib/format-amount';

function getDefaultRange() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function toStart(value: string): string {
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function toEndExclusive(value: string): string {
  const end = new Date(`${value}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  return end.toISOString();
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(value));
}

export default function ReportsPage() {
  const [range, setRange] = useState({ from: '', to: '' });
  const [accountId, setAccountId] = useState('');
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');

  useEffect(() => {
    setRange(getDefaultRange());
  }, []);

  const from = range.from ? toStart(range.from) : '';
  const to = range.to ? toEndExclusive(range.to) : '';
  const reportEnabled = Boolean(from && to);
  const scope = accountId ? { accountId } : {};
  const reportSummaryQuery = useQuery({
    queryKey: [...reportKeys.all, 'summary', from, to, accountId],
    queryFn: () => fetchReportSummary({ from, to, ...scope }),
    enabled: reportEnabled,
  });
  const periodicQuery = useQuery({
    queryKey: [...reportKeys.all, 'periodic', from, to, period, accountId],
    queryFn: () => fetchPeriodicReport({ from, to, period, ...scope }),
    enabled: reportEnabled,
  });
  const statsQuery = useQuery({
    queryKey: [...reportKeys.all, 'stats', from, to],
    queryFn: () => fetchTransactionStats({ from, to }),
    enabled: reportEnabled,
  });
  const statementQuery = useQuery({
    queryKey: [...reportKeys.all, 'statement', accountId, from, to],
    queryFn: () => fetchAccountStatement(accountId, { from, to }),
    enabled: reportEnabled && Boolean(accountId),
  });

  const maxCount = useMemo(
    () => Math.max(1, ...(periodicQuery.data?.map((item) => item.transactionCount) ?? [0])),
    [periodicQuery.data],
  );

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="overline" color="secondary.main">
          ANALİTİK
        </Typography>
        <Typography variant="h2" component="h1">
          Raporlar
        </Typography>
        <Typography color="text.secondary">
          Tarih aralığına göre para akışınızı ve hesap ekstresini inceleyin.
        </Typography>
      </Stack>

      <Paper elevation={0} sx={{ p: 2, borderRadius: '12px' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            label="Başlangıç"
            type="date"
            value={range.from}
            onChange={(event) => setRange((current) => ({ ...current, from: event.target.value }))}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Bitiş"
            type="date"
            value={range.to}
            onChange={(event) => setRange((current) => ({ ...current, to: event.target.value }))}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <Box sx={{ minWidth: 220, flex: 1 }}>
            <AccountAutocompleteField
              value={accountId}
              onChange={setAccountId}
              label="Hesap kapsamı"
              placeholder="Tüm hesaplar"
            />
          </Box>
          <TextField
            select
            label="Gruplama"
            value={period}
            onChange={(event) => setPeriod(event.target.value as typeof period)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="day">Günlük</MenuItem>
            <MenuItem value="week">Haftalık</MenuItem>
            <MenuItem value="month">Aylık</MenuItem>
          </TextField>
        </Stack>
      </Paper>

      {reportEnabled && reportSummaryQuery.isError && (
        <Alert severity="error">Özet raporu yüklenemedi. Tarih aralığını kontrol edin.</Alert>
      )}
      {reportSummaryQuery.isLoading && <Skeleton variant="rounded" height={150} />}
      {reportSummaryQuery.isSuccess && reportSummaryQuery.data.length === 0 && (
        <Paper elevation={0} sx={{ p: 3, borderRadius: '12px' }}>
          <Typography>Bu tarih aralığında raporlanacak hareket bulunamadı.</Typography>
        </Paper>
      )}
      {reportSummaryQuery.isSuccess && reportSummaryQuery.data.length > 0 && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
            gap: 2,
          }}
        >
          {reportSummaryQuery.data.map((summary) => (
            <Paper key={summary.currency} elevation={0} sx={{ p: 2.5, borderRadius: '12px' }}>
              <Typography variant="overline" color="text.secondary">
                {summary.currency}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Giriş
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>
                {formatAmount(summary.totalCredits, summary.currency)}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Çıkış
              </Typography>
              <Typography sx={{ fontWeight: 700 }}>
                {formatAmount(summary.totalDebits, summary.currency)}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Net akış
              </Typography>
              <Typography color="primary.main" sx={{ fontWeight: 800 }}>
                {formatAmount(summary.net, summary.currency)}
              </Typography>
            </Paper>
          ))}
        </Box>
      )}

      <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: '12px' }}>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
          >
            <Typography variant="h3">Dönemsel hareketler</Typography>
            <Typography variant="body2" color="text.secondary">
              {statsQuery.isSuccess
                ? `${statsQuery.data.totalTransactions} işlem · ${statsQuery.data.successRate}% başarı`
                : 'İşlem istatistikleri'}
            </Typography>
          </Stack>
          {statsQuery.isError && <Alert severity="error">İşlem istatistikleri yüklenemedi.</Alert>}
          {statsQuery.isLoading && <Skeleton variant="rounded" height={72} />}
          {periodicQuery.isLoading && <Skeleton variant="rounded" height={220} />}
          {periodicQuery.isError && <Alert severity="error">Dönemsel rapor yüklenemedi.</Alert>}
          {periodicQuery.isSuccess && periodicQuery.data.length === 0 && (
            <Typography color="text.secondary">Bu dönem için hareket verisi yok.</Typography>
          )}
          {periodicQuery.isSuccess && periodicQuery.data.length > 0 && (
            <Stack spacing={1.5}>
              {periodicQuery.data.map((item) => (
                <Box
                  key={`${item.periodStart}-${item.currency}`}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '130px 1fr auto' },
                    alignItems: 'center',
                    gap: 1.5,
                  }}
                >
                  <Typography variant="body2">{formatDate(item.periodStart)}</Typography>
                  <Box>
                    <Box
                      role="img"
                      aria-label={`${item.transactionCount} işlem`}
                      sx={{
                        width: `${Math.max(5, (item.transactionCount / maxCount) * 100)}%`,
                        height: 10,
                        borderRadius: 5,
                        bgcolor: 'primary.main',
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {item.transactionCount} işlem · {item.currency}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
                    +{formatAmount(item.totalCredits, item.currency)} / −
                    {formatAmount(item.totalDebits, item.currency)}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Stack>
      </Paper>

      {accountId && (
        <Paper elevation={0} sx={{ p: { xs: 2, md: 3 }, borderRadius: '12px' }}>
          <Stack spacing={2}>
            <Typography variant="h3">Hesap ekstresi</Typography>
            {statementQuery.isLoading && <Skeleton variant="rounded" height={180} />}
            {statementQuery.isError && <Alert severity="error">Ekstre yüklenemedi.</Alert>}
            {statementQuery.isSuccess && (
              <>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Typography>
                    Açılış:{' '}
                    <strong>
                      {formatAmount(
                        statementQuery.data.openingBalance,
                        statementQuery.data.currency,
                      )}
                    </strong>
                  </Typography>
                  <Typography>
                    Kapanış:{' '}
                    <strong>
                      {formatAmount(
                        statementQuery.data.closingBalance,
                        statementQuery.data.currency,
                      )}
                    </strong>
                  </Typography>
                </Stack>
                {statementQuery.data.movements.length === 0 ? (
                  <Typography color="text.secondary">
                    Seçilen aralıkta ekstre hareketi yok.
                  </Typography>
                ) : (
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small" aria-label="Hesap ekstresi">
                      <TableHead>
                        <TableRow>
                          <TableCell>Tarih</TableCell>
                          <TableCell>Referans</TableCell>
                          <TableCell>Hareket</TableCell>
                          <TableCell align="right">Tutar</TableCell>
                          <TableCell align="right">Bakiye</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {statementQuery.data.movements.map((movement) => (
                          <TableRow key={movement.id}>
                            <TableCell>{formatDate(movement.createdAt)}</TableCell>
                            <TableCell>{movement.referenceNo}</TableCell>
                            <TableCell>
                              {movement.direction === 'CREDIT' ? 'Giriş' : 'Çıkış'}
                            </TableCell>
                            <TableCell align="right">
                              {formatAmount(movement.amount, statementQuery.data.currency)}
                            </TableCell>
                            <TableCell align="right">
                              {formatAmount(movement.balanceAfter, statementQuery.data.currency)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                )}
              </>
            )}
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
