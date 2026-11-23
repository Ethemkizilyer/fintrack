'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { createAccountSchema, type CreateAccountInput } from '@fintrack/shared';
import { RequireAuth } from '@/features/auth/components/require-auth';
import { useCreateAccount } from '@/features/accounts/hooks/use-create-account';
import { getApiErrorMessage } from '@/lib/error-messages';

const currencies = [
  { value: 'TRY', label: 'Türk lirası (TRY)' },
  { value: 'USD', label: 'ABD doları (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
] as const;

export default function NewAccountPage() {
  const router = useRouter();
  const createAccountMutation = useCreateAccount();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateAccountInput>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: { currency: 'TRY' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await createAccountMutation.mutateAsync(values);
      router.replace('/dashboard');
    } catch (error: unknown) {
      setServerError(getApiErrorMessage(error, 'Hesap açılamadı. Lütfen tekrar deneyin.'));
    }
  });

  return (
    <RequireAuth allowedRoles={['CUSTOMER']}>
      <Stack spacing={3} sx={{ maxWidth: 680, mx: 'auto' }}>
        <Stack spacing={1}>
          <Typography variant="overline" color="secondary.main">
            YENİ HESAP
          </Typography>
          <Typography variant="h2" component="h1">
            Hesap açın
          </Typography>
          <Typography color="text.secondary">
            Para birimini seçin. Hesap numaranız güvenli şekilde oluşturulacak.
          </Typography>
        </Stack>

        <Paper
          component="form"
          onSubmit={(event) => {
            void onSubmit(event);
          }}
          noValidate
          elevation={0}
          sx={{ p: 3, borderRadius: '12px' }}
        >
          <Stack spacing={2.5}>
            {serverError && <Alert severity="error">{serverError}</Alert>}
            <Controller
              name="currency"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Hesap para birimi"
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                  error={Boolean(errors.currency)}
                  helperText={errors.currency?.message}
                >
                  {currencies.map((currency) => (
                    <MenuItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
              <Button color="inherit" onClick={() => router.back()}>
                Vazgeç
              </Button>
              <Button type="submit" variant="contained" disabled={createAccountMutation.isPending}>
                {createAccountMutation.isPending ? 'Hesap açılıyor…' : 'Hesabı aç'}
              </Button>
            </Stack>
          </Stack>
        </Paper>
      </Stack>
    </RequireAuth>
  );
}
