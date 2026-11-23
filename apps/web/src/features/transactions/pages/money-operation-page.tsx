'use client';

import Link from 'next/link';
import { Alert, Button, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { useAccounts } from '@/features/accounts/hooks/use-accounts';
import { DepositWithdrawalForm } from '../components/deposit-withdrawal-form';
import { TransferForm } from '../components/transfer-form';

type Operation = 'deposit' | 'withdrawal' | 'transfer';

const copy: Record<Operation, { eyebrow: string; title: string; description: string }> = {
  deposit: {
    eyebrow: 'PARA HAREKETİ',
    title: 'Hesaba para yatır',
    description: 'Yatırma isteğiniz tekil bir anahtarla güvenli biçimde işlenir.',
  },
  withdrawal: {
    eyebrow: 'PARA HAREKETİ',
    title: 'Hesaptan para çek',
    description: 'Bakiye kontrolü sunucu tarafında ve atomik işlem içinde yapılır.',
  },
  transfer: {
    eyebrow: 'PARA HAREKETİ',
    title: 'Hesaplar arası transfer',
    description: 'Alıcı hesap numarasını ve gönderen hesabı doğrulayın.',
  },
};

export function MoneyOperationPage({ operation }: { operation: Operation }) {
  const accountsQuery = useAccounts();
  const content = copy[operation];
  const activeAccounts = accountsQuery.data?.filter((account) => account.status === 'ACTIVE') ?? [];

  return (
    <Stack spacing={3} sx={{ maxWidth: 720, mx: 'auto' }}>
      <Stack spacing={0.5}>
        <Typography variant="overline" color="secondary.main">
          {content.eyebrow}
        </Typography>
        <Typography variant="h2" component="h1">
          {content.title}
        </Typography>
        <Typography color="text.secondary">{content.description}</Typography>
      </Stack>

      {accountsQuery.isLoading && <Skeleton variant="rounded" height={320} />}
      {accountsQuery.isError && (
        <Alert
          severity="error"
          action={<Button onClick={() => void accountsQuery.refetch()}>Tekrar dene</Button>}
        >
          Hesaplar yüklenemedi.
        </Alert>
      )}
      {accountsQuery.isSuccess && activeAccounts.length === 0 && (
        <Paper elevation={0} sx={{ p: 3, borderRadius: '12px' }}>
          <Stack spacing={2}>
            <Typography>İşlem yapabileceğiniz aktif hesabınız bulunmuyor.</Typography>
            <Button component={Link} href="/dashboard/accounts/new" variant="contained">
              Hesap aç
            </Button>
          </Stack>
        </Paper>
      )}
      {accountsQuery.isSuccess &&
        activeAccounts.length > 0 &&
        (operation === 'transfer' ? (
          <TransferForm accounts={activeAccounts} />
        ) : (
          <DepositWithdrawalForm operation={operation} accounts={activeAccounts} />
        ))}
    </Stack>
  );
}
