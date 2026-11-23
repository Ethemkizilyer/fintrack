'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Paper, Stack, Typography } from '@mui/material';
import { RequireAuth } from '@/features/auth/components/require-auth';
import { CustomerForm } from '@/features/customers/components/customer-form';
import { useCreateCustomer } from '@/features/customers/hooks/use-create-customer';
import { getApiErrorMessage } from '@/lib/error-messages';

const adminRoles = ['ADMIN'] as const;

export default function NewCustomerPage() {
  const router = useRouter();
  const createMutation = useCreateCustomer();
  const [serverError, setServerError] = useState<string | null>(null);

  return (
    <RequireAuth allowedRoles={adminRoles}>
      <Stack spacing={3} sx={{ maxWidth: 760, mx: 'auto' }}>
        <Stack spacing={0.5}>
          <Typography variant="overline" color="secondary.main">
            YENİ KAYIT
          </Typography>
          <Typography variant="h2" component="h1">
            Müşteri ekle
          </Typography>
          <Typography color="text.secondary">
            Müşteri profili ve giriş hesabı tek işlemde oluşturulur.
          </Typography>
        </Stack>
        <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: '12px' }}>
          <Stack spacing={2}>
            {serverError && <Alert severity="error">{serverError}</Alert>}
            <CustomerForm
              mode="create"
              pending={createMutation.isPending}
              onSubmit={(values) => {
                setServerError(null);
                void createMutation
                  .mutateAsync(values)
                  .then((customer) => router.replace(`/admin/customers/${customer.id}`))
                  .catch((error: unknown) => {
                    setServerError(
                      getApiErrorMessage(error, 'Müşteri oluşturulamadı. Bilgileri kontrol edin.'),
                    );
                  });
              }}
            />
          </Stack>
        </Paper>
      </Stack>
    </RequireAuth>
  );
}
