'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { z } from 'zod';
import { type CreateMoneyOperationInput, type PublicAccount } from '@fintrack/shared';
import { useCreateDeposit, useCreateWithdrawal } from '../hooks/use-money-mutations';
import { getApiErrorMessage } from '@/lib/error-messages';
import { formatAmount } from '@/lib/format-amount';
import { formatLocalizedAmountInput } from '@/lib/localized-input';
import { localizedDepositSchema, localizedWithdrawalSchema } from '../money-form.schemas';

type DepositWithdrawalFormProps = {
  operation: 'deposit' | 'withdrawal';
  accounts: PublicAccount[];
};

export function DepositWithdrawalForm({ operation, accounts }: DepositWithdrawalFormProps) {
  const schema = operation === 'deposit' ? localizedDepositSchema : localizedWithdrawalSchema;
  const depositMutation = useCreateDeposit();
  const withdrawalMutation = useCreateWithdrawal();
  const mutation = operation === 'deposit' ? depositMutation : withdrawalMutation;
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [serverError, setServerError] = useState<string | null>(null);
  const [referenceNo, setReferenceNo] = useState<string | null>(null);
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof schema>, unknown, CreateMoneyOperationInput>({
    resolver: zodResolver(schema),
    defaultValues: { accountId: accounts[0]?.id ?? '', amount: '', description: '' },
  });
  const selectedAccountId = useWatch({ control, name: 'accountId' });
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setReferenceNo(null);
    try {
      const result =
        operation === 'deposit'
          ? await depositMutation.mutateAsync({ input: values, idempotencyKey })
          : await withdrawalMutation.mutateAsync({ input: values, idempotencyKey });
      setReferenceNo(result.referenceNo);
      setIdempotencyKey(crypto.randomUUID());
      reset({ accountId: values.accountId, amount: '', description: '' });
    } catch (error: unknown) {
      setServerError(
        getApiErrorMessage(error, 'İşlem tamamlanamadı. Bilgileri kontrol edip tekrar deneyin.'),
      );
    }
  });

  const title = operation === 'deposit' ? 'Para yatır' : 'Para çek';
  const isPending = mutation.isPending;

  return (
    <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: '12px' }}>
      <Stack
        component="form"
        spacing={2.5}
        noValidate
        onSubmit={(event) => {
          void onSubmit(event);
        }}
      >
        {serverError && <Alert severity="error">{serverError}</Alert>}
        {referenceNo && (
          <Alert severity="success">
            İşlem tamamlandı. Referans numarası: <strong>{referenceNo}</strong>
          </Alert>
        )}
        <Controller
          name="accountId"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              select
              label="Hesap"
              fullWidth
              error={Boolean(errors.accountId)}
              helperText={errors.accountId?.message}
            >
              {accounts.map((account) => (
                <MenuItem key={account.id} value={account.id}>
                  {account.currency} · •••• {account.accountNumber.slice(-4)} ·{' '}
                  {formatAmount(account.balance, account.currency)}
                </MenuItem>
              ))}
            </TextField>
          )}
        />
        <Controller
          name="amount"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              onBlur={(event) => {
                field.onBlur();
                field.onChange(formatLocalizedAmountInput(event.target.value));
              }}
              label={`Tutar (${selectedAccount?.currency ?? 'TRY'})`}
              placeholder="1.250,50"
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
              fullWidth
              error={Boolean(errors.amount)}
              helperText={errors.amount?.message ?? 'Örnek: 1.250,50'}
            />
          )}
        />
        <TextField
          {...register('description')}
          label="Açıklama (isteğe bağlı)"
          placeholder="İşlem açıklaması"
          fullWidth
          error={Boolean(errors.description)}
          helperText={errors.description?.message}
        />
        <Stack spacing={1}>
          <Typography variant="caption" color="text.secondary">
            Tekrar gönderimlerde aynı güvenli istek anahtarı korunur.
          </Typography>
          <Button type="submit" variant="contained" disabled={isPending}>
            {isPending ? 'İşleniyor…' : title}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
