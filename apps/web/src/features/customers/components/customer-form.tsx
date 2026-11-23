'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, MenuItem, Stack, TextField } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  createCustomerSchema,
  updateCustomerSchema,
  type CreateCustomerInput,
  type PublicCustomer,
  type UpdateCustomerInput,
} from '@fintrack/shared';
import { formatTurkishPhone } from '@/lib/localized-input';

const turkishPhoneSchema = z
  .string()
  .transform(formatTurkishPhone)
  .pipe(
    z
      .string()
      .min(7, 'Geçerli bir telefon girin')
      .max(20, 'Telefon numarası en fazla 20 karakter olabilir'),
  );

const createCustomerFormSchema = createCustomerSchema.extend({
  phone: turkishPhoneSchema,
});

const updateCustomerFormSchema = updateCustomerSchema.extend({
  phone: turkishPhoneSchema.optional(),
});

type CreateCustomerFormProps = {
  mode: 'create';
  pending: boolean;
  onSubmit: (values: CreateCustomerInput) => void;
};

type UpdateCustomerFormProps = {
  mode: 'update';
  customer: PublicCustomer;
  pending: boolean;
  onSubmit: (values: UpdateCustomerInput) => void;
};

type CustomerFormProps = CreateCustomerFormProps | UpdateCustomerFormProps;

export function CustomerForm(props: CustomerFormProps) {
  if (props.mode === 'create') return <CreateCustomerFields {...props} />;
  return <UpdateCustomerFields {...props} />;
}

function CreateCustomerFields({ pending, onSubmit }: CreateCustomerFormProps) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.input<typeof createCustomerFormSchema>, unknown, CreateCustomerInput>({
    resolver: zodResolver(createCustomerFormSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      nationalId: '',
      phone: '',
    },
  });

  return (
    <Stack
      component="form"
      spacing={2}
      noValidate
      onSubmit={(event) => {
        void handleSubmit(onSubmit)(event);
      }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          {...register('firstName')}
          label="Ad"
          fullWidth
          error={Boolean(errors.firstName)}
          helperText={errors.firstName?.message}
        />
        <TextField
          {...register('lastName')}
          label="Soyad"
          fullWidth
          error={Boolean(errors.lastName)}
          helperText={errors.lastName?.message}
        />
      </Stack>
      <TextField
        {...register('email')}
        label="E-posta"
        type="email"
        autoComplete="email"
        fullWidth
        error={Boolean(errors.email)}
        helperText={errors.email?.message}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          {...register('password')}
          label="Geçici şifre"
          type="password"
          autoComplete="new-password"
          fullWidth
          error={Boolean(errors.password)}
          helperText={errors.password?.message}
        />
        <Controller
          name="phone"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Telefon"
              placeholder="+90 5xx xxx xx xx"
              autoComplete="tel"
              slotProps={{ htmlInput: { inputMode: 'tel' } }}
              fullWidth
              onBlur={(event) => {
                field.onBlur();
                field.onChange(formatTurkishPhone(event.target.value));
              }}
              error={Boolean(errors.phone)}
              helperText={errors.phone?.message}
            />
          )}
        />
      </Stack>
      <TextField
        {...register('nationalId')}
        label="T.C. kimlik numarası"
        slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 11 } }}
        error={Boolean(errors.nationalId)}
        helperText={
          errors.nationalId?.message ?? 'Bu bilgi yalnızca müşteri kaydı için kullanılır.'
        }
      />
      <Button type="submit" variant="contained" disabled={pending}>
        {pending ? 'Müşteri oluşturuluyor…' : 'Müşteriyi oluştur'}
      </Button>
    </Stack>
  );
}

function UpdateCustomerFields({ customer, pending, onSubmit }: UpdateCustomerFormProps) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.input<typeof updateCustomerFormSchema>, unknown, UpdateCustomerInput>({
    resolver: zodResolver(updateCustomerFormSchema),
    defaultValues: {
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      status: customer.status,
    },
  });

  return (
    <Stack
      component="form"
      spacing={2}
      noValidate
      onSubmit={(event) => {
        void handleSubmit(onSubmit)(event);
      }}
    >
      <TextField
        {...register('firstName')}
        label="Ad"
        error={Boolean(errors.firstName)}
        helperText={errors.firstName?.message}
      />
      <TextField
        {...register('lastName')}
        label="Soyad"
        error={Boolean(errors.lastName)}
        helperText={errors.lastName?.message}
      />
      <Controller
        name="phone"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            label="Telefon"
            placeholder="+90 5xx xxx xx xx"
            slotProps={{ htmlInput: { inputMode: 'tel' } }}
            onBlur={(event) => {
              field.onBlur();
              field.onChange(formatTurkishPhone(event.target.value));
            }}
            error={Boolean(errors.phone)}
            helperText={errors.phone?.message}
          />
        )}
      />
      <TextField {...register('status')} label="Durum" select>
        <MenuItem value="ACTIVE">Aktif</MenuItem>
        <MenuItem value="PASSIVE">Pasif</MenuItem>
      </TextField>
      <Button type="submit" variant="contained" disabled={pending}>
        {pending ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'}
      </Button>
    </Stack>
  );
}
