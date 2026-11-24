'use client';

import Link from 'next/link';
import { Alert, Box, Button, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { useAuthStore } from '@/features/auth/auth.store';
import { AccountCard } from '@/features/accounts/components/account-card';
import { useAccounts } from '@/features/accounts/hooks/use-accounts';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const accountsQuery = useAccounts();
  const accounts = accountsQuery.data ?? [];

  const firstName = user?.customer?.firstName;
  const greeting = firstName ? `Merhaba, ${firstName}` : 'FinTrack hesabınız';

  return (
    <Stack spacing={4}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ alignItems: { sm: 'flex-end' }, justifyContent: 'space-between' }}
      >
        <Box>
          <Typography variant="overline" color="secondary.main">
            {user?.role === 'ADMIN' ? 'YÖNETİCİ GÖRÜNÜMÜ' : 'FİNANSAL ÖZET'}
          </Typography>
          <Typography variant="h2" component="h1" sx={{ mt: 0.7 }}>
            {greeting}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            Hesaplarınız ve kullanılabilir bakiyeleriniz tek yerde.
          </Typography>
        </Box>
        {user?.role === 'CUSTOMER' && (
          <Button
            component={Link}
            href="/dashboard/accounts/new"
            variant="contained"
            color="primary"
            style={{ color: 'var(--primary-action-text)' }}
          >
            Yeni hesap aç
          </Button>
        )}
      </Stack>

      {accountsQuery.isLoading && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
            gap: 2,
          }}
        >
          {[0, 1].map((item) => (
            <Skeleton key={item} variant="rounded" height={230} />
          ))}
        </Box>
      )}

      {accountsQuery.isError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void accountsQuery.refetch()}>
              Tekrar dene
            </Button>
          }
        >
          Hesaplar yüklenemedi. API bağlantınızı kontrol edip tekrar deneyin.
        </Alert>
      )}

      {accountsQuery.isSuccess && accounts.length === 0 && (
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 5 },
            borderRadius: '12px',
            textAlign: 'center',
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="h3">Henüz bir hesabınız yok</Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 480, mx: 'auto', mt: 1 }}>
            İlk hesabınızı açın; hesap numaranız ve bakiyeniz burada güvenle görüntülensin.
          </Typography>
          {user?.role === 'CUSTOMER' && (
            <Button
              component={Link}
              href="/dashboard/accounts/new"
              variant="contained"
              sx={{ mt: 3 }}
            >
              İlk hesabınızı açın
            </Button>
          )}
        </Paper>
      )}

      {accountsQuery.isSuccess && accounts.length > 0 && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
            gap: 2,
          }}
        >
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              showFullNumber={user?.role === 'ADMIN'}
            />
          ))}
        </Box>
      )}
    </Stack>
  );
}
