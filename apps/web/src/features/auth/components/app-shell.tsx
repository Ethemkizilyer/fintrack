'use client';

import type { ReactNode } from 'react';
import { AppBar, Box, Button, Chip, Container, Stack, Toolbar, Typography } from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { logout } from '@/features/auth/api/auth.api';
import { useAuthStore } from '@/features/auth/auth.store';
import { ExchangeRatesMenu } from '@/features/exchange-rates/components/exchange-rates-menu';
import { useMutation } from '@tanstack/react-query';

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: () => router.replace('/login'),
  });
  const displayName = user?.customer
    ? `${user.customer.firstName} ${user.customer.lastName}`
    : (user?.email ?? 'FinTrack kullanıcısı');
  const navigation =
    user?.role === 'ADMIN'
      ? [
          { label: 'Genel bakış', href: '/dashboard' },
          { label: 'Müşteriler', href: '/admin/customers' },
          { label: 'Yatırma', href: '/dashboard/deposit' },
          { label: 'Çekme', href: '/dashboard/withdraw' },
          { label: 'Transfer', href: '/dashboard/transfer' },
          { label: 'İşlem geçmişi', href: '/dashboard/transactions' },
          { label: 'Raporlar', href: '/dashboard/reports' },
        ]
      : [
          { label: 'Genel bakış', href: '/dashboard' },
          { label: 'Para yatır', href: '/dashboard/deposit' },
          { label: 'Para çek', href: '/dashboard/withdraw' },
          { label: 'Transfer', href: '/dashboard/transfer' },
          { label: 'İşlemler', href: '/dashboard/transactions' },
          { label: 'Raporlar', href: '/dashboard/reports' },
        ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'rgba(255, 254, 250, 0.94)',
          color: 'text.primary',
          borderBottom: '1px solid',
          borderColor: 'divider',
          backdropFilter: 'blur(14px)',
        }}
      >
        <Toolbar disableGutters>
          <Container
            maxWidth="lg"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
            }}
          >
            <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center' }}>
              <Box
                aria-hidden="true"
                sx={{
                  display: 'grid',
                  width: 36,
                  height: 36,
                  placeItems: 'center',
                  borderRadius: '12px 12px 12px 4px',
                  bgcolor: 'primary.main',
                  color: 'common.white',
                  fontWeight: 800,
                }}
              >
                F
              </Box>
              <Typography sx={{ fontWeight: 800, letterSpacing: '-0.04em' }}>FinTrack</Typography>
              <Chip
                size="small"
                label={user?.role === 'ADMIN' ? 'YÖNETİCİ' : 'HESAPLARIM'}
                sx={{
                  display: { xs: 'none', sm: 'inline-flex' },
                  ml: 1,
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: '0.62rem',
                }}
              />
            </Stack>

            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <ExchangeRatesMenu />
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ display: { xs: 'none', md: 'block' } }}
              >
                {displayName}
              </Typography>
              <Button
                variant="outlined"
                color="primary"
                size="small"
                disabled={logoutMutation.isPending}
                onClick={() => logoutMutation.mutate()}
              >
                {logoutMutation.isPending ? 'Çıkış yapılıyor' : 'Çıkış yap'}
              </Button>
            </Stack>
          </Container>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        aria-label="Ana gezinme"
        sx={{
          overflowX: 'auto',
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Container maxWidth="lg">
          <Stack direction="row" spacing={0.5} sx={{ minWidth: 'max-content', py: 1 }}>
            {navigation.map((item) => (
              <Button
                key={item.href}
                component={Link}
                href={item.href}
                color="inherit"
                size="small"
                sx={{ minHeight: 38, px: 1.5, borderRadius: '8px' }}
              >
                {item.label}
              </Button>
            ))}
          </Stack>
        </Container>
      </Box>
      <Container component="main" maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        {children}
      </Container>
    </Box>
  );
}
