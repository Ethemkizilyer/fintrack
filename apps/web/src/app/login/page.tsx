'use client';

import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  Container,
  Link as MuiLink,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { loginSchema, type LoginInput } from '@fintrack/shared';
import { useAuthStore } from '@/features/auth/auth.store';
import { useLogin } from '@/features/auth/hooks/use-login';
import { getApiErrorMessage } from '@/lib/error-messages';

export default function LoginPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const loginMutation = useLogin();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (isInitialized && user) router.replace('/dashboard');
  }, [isInitialized, router, user]);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await loginMutation.mutateAsync(values);
      router.replace('/dashboard');
    } catch (error: unknown) {
      setServerError(getApiErrorMessage(error, 'Giriş yapılamadı. Bilgilerinizi kontrol edin.'));
    }
  });

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        alignItems: 'center',
        py: 5,
        background:
          'radial-gradient(ellipse at 85% 15%, rgba(194, 122, 74, 0.13), transparent 26rem), radial-gradient(ellipse at 10% 80%, rgba(23, 74, 66, 0.1), transparent 30rem)',
      }}
    >
      <Container maxWidth="sm">
        <Stack spacing={3}>
          <MuiLink component={Link} href="/" underline="none" color="inherit">
            <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center' }}>
              <Box
                aria-hidden="true"
                sx={{
                  display: 'grid',
                  width: 40,
                  height: 40,
                  placeItems: 'center',
                  borderRadius: '13px 13px 13px 4px',
                  bgcolor: 'primary.main',
                  color: 'common.white',
                  fontWeight: 800,
                }}
              >
                F
              </Box>
              <Typography sx={{ fontWeight: 800, letterSpacing: '-0.04em' }}>FinTrack</Typography>
            </Stack>
          </MuiLink>

          <Paper
            component="form"
            onSubmit={(event) => {
              void onSubmit(event);
            }}
            noValidate
            elevation={0}
            sx={{
              p: { xs: 3, sm: 5 },
              borderRadius: '16px',
              bgcolor: 'background.paper',
              boxShadow: '0 28px 80px rgba(23, 43, 39, 0.09)',
            }}
          >
            <Stack spacing={3}>
              <Box>
                <Typography variant="overline" color="secondary.main">
                  GÜVENLİ OTURUM
                </Typography>
                <Typography variant="h2" component="h1" sx={{ mt: 1 }}>
                  Tekrar hoş geldiniz.
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1.5 }}>
                  Hesaplarınıza erişmek için giriş bilgilerinizi kullanın.
                </Typography>
              </Box>

              {serverError && <Alert severity="error">{serverError}</Alert>}

              <TextField
                {...register('email')}
                label="E-posta"
                placeholder="ornek@fintrack.com"
                type="email"
                autoComplete="username"
                autoFocus
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                error={Boolean(errors.email)}
                helperText={errors.email?.message}
              />
              <TextField
                {...register('password')}
                label="Şifre"
                placeholder="Şifrenizi girin"
                type="password"
                autoComplete="current-password"
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
                error={Boolean(errors.password)}
                helperText={errors.password?.message}
              />
              <Button
                type="submit"
                size="large"
                variant="contained"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? 'Giriş yapılıyor…' : 'Giriş yap'}
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
                Oturum güvenliği httpOnly yenileme çereziyle korunur.
              </Typography>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}
