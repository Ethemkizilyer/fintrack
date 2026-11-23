'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Chip,
  Drawer,
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
import type { AccountTransactionsQuery } from '@fintrack/shared';
import { useAccounts } from '@/features/accounts/hooks/use-accounts';
import { useAccountHistory } from '@/features/transactions/hooks/use-account-history';
import { useTransaction } from '@/features/transactions/hooks/use-transaction';
import { formatAmount } from '@/lib/format-amount';

const PAGE_SIZE = 20;

function toStartOfDay(value: string | null): string | undefined {
  return value ? new Date(`${value}T00:00:00.000Z`).toISOString() : undefined;
}

function toEndExclusive(value: string | null): string | undefined {
  if (!value) return undefined;
  const end = new Date(`${value}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  return end.toISOString();
}

function getFormString(formData: FormData, name: string, fallback = ''): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : fallback;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

const transactionLabels = {
  DEPOSIT: 'Para yatırma',
  WITHDRAWAL: 'Para çekme',
  TRANSFER: 'Transfer',
} as const;

export default function TransactionHistoryPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const accountsQuery = useAccounts();
  const accounts = accountsQuery.data ?? [];
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);

  const accountId = searchParams.get('accountId') ?? accounts[0]?.id ?? '';
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const type = searchParams.get('type') ?? '';
  const status = searchParams.get('status') ?? '';
  const query: AccountTransactionsQuery = {
    page,
    limit: PAGE_SIZE,
    sort: 'createdAt',
    order: 'desc',
    ...(from ? { from: toStartOfDay(from) } : {}),
    ...(to ? { to: toEndExclusive(to) } : {}),
    ...(type === 'DEPOSIT' || type === 'WITHDRAWAL' || type === 'TRANSFER' ? { type } : {}),
    ...(status === 'PENDING' || status === 'COMPLETED' || status === 'FAILED' ? { status } : {}),
  };
  const historyQuery = useAccountHistory(accountId, query);
  const detailQuery = useTransaction(selectedTransactionId);

  function applyFilters(formData: FormData) {
    const params = new URLSearchParams();
    params.set('accountId', getFormString(formData, 'accountId', accountId));
    const nextFrom = getFormString(formData, 'from');
    const nextTo = getFormString(formData, 'to');
    const nextType = getFormString(formData, 'type');
    const nextStatus = getFormString(formData, 'status');
    if (nextFrom) params.set('from', nextFrom);
    if (nextTo) params.set('to', nextTo);
    if (nextType) params.set('type', nextType);
    if (nextStatus) params.set('status', nextStatus);
    router.replace(`${pathname}?${params.toString()}`);
  }

  function goToPage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(nextPage));
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <Stack spacing={3}>
      <Stack spacing={0.5}>
        <Typography variant="overline" color="secondary.main">
          HESAP HAREKETLERİ
        </Typography>
        <Typography variant="h2" component="h1">
          İşlem geçmişi
        </Typography>
        <Typography color="text.secondary">
          Hesap hareketlerinizi filtreleyin, detayları güvenli şekilde görüntüleyin.
        </Typography>
      </Stack>

      {accountsQuery.isLoading && <Skeleton variant="rounded" height={220} />}
      {accountsQuery.isError && (
        <Alert
          severity="error"
          action={<Button onClick={() => void accountsQuery.refetch()}>Tekrar dene</Button>}
        >
          Hesaplar yüklenemedi.
        </Alert>
      )}
      {accountsQuery.isSuccess && accounts.length === 0 && (
        <Paper elevation={0} sx={{ p: 3, borderRadius: '12px' }}>
          <Typography>İşlem geçmişini görmek için önce bir hesabınız olmalı.</Typography>
        </Paper>
      )}

      {accountsQuery.isSuccess && accounts.length > 0 && (
        <>
          <Paper
            component="form"
            elevation={0}
            sx={{ p: 2, borderRadius: '12px' }}
            onSubmit={(event) => {
              event.preventDefault();
              applyFilters(new FormData(event.currentTarget));
            }}
          >
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={1.5}
              sx={{ alignItems: { md: 'center' } }}
            >
              <TextField
                select
                name="accountId"
                label="Hesap"
                defaultValue={accountId}
                key={accountId}
                fullWidth
              >
                {accounts.map((account) => (
                  <MenuItem key={account.id} value={account.id}>
                    {account.currency} · •••• {account.accountNumber.slice(-4)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                name="from"
                label="Başlangıç"
                type="date"
                defaultValue={from ?? ''}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                name="to"
                label="Bitiş"
                type="date"
                defaultValue={to ?? ''}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                select
                name="type"
                label="İşlem türü"
                defaultValue={type}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="">Tümü</MenuItem>
                <MenuItem value="DEPOSIT">Yatırma</MenuItem>
                <MenuItem value="WITHDRAWAL">Çekme</MenuItem>
                <MenuItem value="TRANSFER">Transfer</MenuItem>
              </TextField>
              <TextField
                select
                name="status"
                label="Durum"
                defaultValue={status}
                sx={{ minWidth: 150 }}
              >
                <MenuItem value="">Tümü</MenuItem>
                <MenuItem value="COMPLETED">Tamamlandı</MenuItem>
                <MenuItem value="FAILED">Başarısız</MenuItem>
                <MenuItem value="PENDING">Bekliyor</MenuItem>
              </TextField>
              <Button type="submit" variant="contained">
                Filtrele
              </Button>
            </Stack>
          </Paper>

          {historyQuery.isLoading && <Skeleton variant="rounded" height={340} />}
          {historyQuery.isError && (
            <Alert
              severity="error"
              action={<Button onClick={() => void historyQuery.refetch()}>Tekrar dene</Button>}
            >
              İşlemler yüklenemedi.
            </Alert>
          )}
          {historyQuery.isSuccess && historyQuery.data.transactions.length === 0 && (
            <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: '12px' }}>
              <Typography variant="h3">Bu filtrelerle işlem yok</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Tarih aralığını veya işlem türünü değiştirip tekrar deneyin.
              </Typography>
            </Paper>
          )}
          {historyQuery.isSuccess && historyQuery.data.transactions.length > 0 && (
            <>
              <Paper elevation={0} sx={{ overflowX: 'auto', borderRadius: '12px' }}>
                <Table aria-label="Hesap işlem geçmişi">
                  <TableHead>
                    <TableRow>
                      <TableCell>Tarih</TableCell>
                      <TableCell>İşlem</TableCell>
                      <TableCell>Referans</TableCell>
                      <TableCell>Durum</TableCell>
                      <TableCell align="right">Tutar</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {historyQuery.data.transactions.map((transaction) => {
                      const isCredit = transaction.direction === 'CREDIT';
                      return (
                        <TableRow
                          key={transaction.id}
                          hover
                          tabIndex={0}
                          sx={{ cursor: 'pointer' }}
                          onClick={() => setSelectedTransactionId(transaction.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') setSelectedTransactionId(transaction.id);
                          }}
                        >
                          <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                          <TableCell>{transactionLabels[transaction.type]}</TableCell>
                          <TableCell>{transaction.referenceNo}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={
                                transaction.status === 'COMPLETED'
                                  ? 'Tamamlandı'
                                  : transaction.status === 'FAILED'
                                    ? 'Başarısız'
                                    : 'Bekliyor'
                              }
                              color={
                                transaction.status === 'COMPLETED'
                                  ? 'success'
                                  : transaction.status === 'FAILED'
                                    ? 'error'
                                    : 'default'
                              }
                            />
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              color: isCredit ? 'success.main' : 'error.main',
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {isCredit ? '+' : '−'}
                            {formatAmount(transaction.amount, transaction.currency)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Paper>
              <Stack
                direction="row"
                spacing={1}
                sx={{ justifyContent: 'flex-end', alignItems: 'center' }}
              >
                <Typography variant="body2" color="text.secondary">
                  Sayfa {historyQuery.data.meta?.page ?? page} /{' '}
                  {historyQuery.data.meta?.totalPages ?? 1}
                </Typography>
                <Button
                  disabled={page <= 1 || historyQuery.isPlaceholderData}
                  onClick={() => goToPage(page - 1)}
                >
                  Önceki
                </Button>
                <Button
                  disabled={
                    page >= (historyQuery.data.meta?.totalPages ?? 1) ||
                    historyQuery.isPlaceholderData
                  }
                  onClick={() => goToPage(page + 1)}
                >
                  Sonraki
                </Button>
              </Stack>
            </>
          )}
        </>
      )}

      <Drawer
        anchor="right"
        open={Boolean(selectedTransactionId)}
        onClose={() => setSelectedTransactionId(null)}
        slotProps={{ paper: { sx: { width: { xs: '100%', sm: 460 }, p: 3 } } }}
      >
        <Stack spacing={2}>
          <Typography variant="h3">İşlem detayı</Typography>
          {detailQuery.isLoading && <Skeleton variant="rounded" height={220} />}
          {detailQuery.isError && <Alert severity="error">İşlem detayı yüklenemedi.</Alert>}
          {detailQuery.data && (
            <Box>
              <Typography>
                <strong>Referans:</strong> {detailQuery.data.referenceNo}
              </Typography>
              <Typography>
                <strong>Tür:</strong> {transactionLabels[detailQuery.data.type]}
              </Typography>
              <Typography>
                <strong>Tutar:</strong>{' '}
                {formatAmount(detailQuery.data.amount, detailQuery.data.currency)}
              </Typography>
              <Typography>
                <strong>Açıklama:</strong> {detailQuery.data.description ?? '—'}
              </Typography>
              {detailQuery.data.failureReason && (
                <Typography color="error.main">
                  <strong>Sonuç:</strong> {detailQuery.data.failureReason}
                </Typography>
              )}
            </Box>
          )}
        </Stack>
      </Drawer>
    </Stack>
  );
}
