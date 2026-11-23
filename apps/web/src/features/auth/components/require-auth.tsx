'use client';

import { useEffect, type ReactNode } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import type { Role } from '@fintrack/shared';
import { useAuthStore } from '@/features/auth/auth.store';

type RequireAuthProps = {
  children: ReactNode;
  allowedRoles?: readonly Role[];
};

export function RequireAuth({ children, allowedRoles }: RequireAuthProps) {
  const router = useRouter();
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const user = useAuthStore((state) => state.user);
  const hasRole = !allowedRoles || (user !== null && allowedRoles.includes(user.role));

  useEffect(() => {
    if (!isInitialized) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!hasRole) router.replace('/dashboard');
  }, [hasRole, isInitialized, router, user]);

  if (!isInitialized || !user || !hasRole) {
    return (
      <Box
        role="status"
        aria-label="Oturum kontrol ediliyor"
        sx={{
          minHeight: '100vh',
          display: 'grid',
          placeContent: 'center',
          justifyItems: 'center',
          gap: 2,
        }}
      >
        <CircularProgress size={28} />
        <Typography color="text.secondary" variant="body2">
          Güvenli oturumunuz kontrol ediliyor
        </Typography>
      </Box>
    );
  }

  return children;
}
