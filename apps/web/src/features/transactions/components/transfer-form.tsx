'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';
import { type CreateTransferInput, type PublicAccount } from '@fintrack/shared';
import { AccountAutocompleteField } from '@/features/accounts/components/account-autocomplete-field';
import { useCreateTransfer } from '../hooks/use-money-mutations';
import { getApiErrorMessage } from '@/lib/error-messages';
import { formatLocalizedAmountInput } from '@/lib/localized-input';
import { localizedTransferSchema } from '../money-form.schemas';

export function TransferForm() {
  const transferMutation = useCreateTransfer();
  const [sourceAccount, setSourceAccount] = useState<PublicAccount | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [serverError, setServerError] = useState<string | null>(null);
  const [referenceNo, setReferenceNo] = useState<string | null>(null);
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.input<typeof localizedTransferSchema>, unknown, CreateTransferInput>({
    resolver: zodResolver(localizedTransferSchema),
    defaultValues: {
      sourceAccountId: '',
      targetAccountNumber: '',
      amount: '',
      description: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setReferenceNo(null);
    try {
      const transaction = await transferMutation.mutateAsync({ input: values, idempotencyKey });
      setReferenceNo(transaction.referenceNo);
      setIdempotencyKey(crypto.randomUUID());
      reset({
        sourceAccountId: values.sourceAccountId,
        targetAccountNumber: '',
        amount: '',
        description: '',
      });
    } catch (error: unknown) {
      setServerError(
        getApiErrorMessage(error, 'Transfer tamamlanamadı. Bilgileri kontrol edip tekrar deneyin.'),
      );
    }
  });

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
            Transfer tamamlandı. Referans numarası: <strong>{referenceNo}</strong>
          </Alert>
        )}
        <Controller
          name="sourceAccountId"
          control={control}
          render={({ field }) => (
            <AccountAutocompleteField
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              inputRef={field.ref}
              onSelectionChange={setSourceAccount}
              status="ACTIVE"
              autoSelectFirst
              label="Gönderen hesap"
              error={Boolean(errors.sourceAccountId)}
              helperText={errors.sourceAccountId?.message}
            />
          )}
        />
        <TextField
          {...register('targetAccountNumber')}
          label="Alıcı hesap numarası"
          placeholder="16 haneli hesap numarası"
          slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 16 } }}
          fullWidth
          error={Boolean(errors.targetAccountNumber)}
          helperText={errors.targetAccountNumber?.message}
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
              label={`Tutar (${sourceAccount?.currency ?? 'TRY'})`}
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
          placeholder="Transfer açıklaması"
          fullWidth
          error={Boolean(errors.description)}
          helperText={errors.description?.message}
        />
        <Typography variant="caption" color="text.secondary">
          Aynı gönderim yeniden denenirse aynı Idempotency-Key kullanılır.
        </Typography>
        <Button type="submit" variant="contained" disabled={transferMutation.isPending}>
          {transferMutation.isPending ? 'Transfer ediliyor…' : 'Transferi onayla'}
        </Button>
      </Stack>
    </Paper>
  );
}
