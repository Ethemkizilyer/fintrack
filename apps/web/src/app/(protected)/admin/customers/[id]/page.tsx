'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Alert, Button, Paper, Skeleton, Stack, Typography } from '@mui/material';
import type { UpdateCustomerInput } from '@fintrack/shared';
import { RequireAuth } from '@/features/auth/components/require-auth';
import { CustomerForm } from '@/features/customers/components/customer-form';
import { useCustomer } from '@/features/customers/hooks/use-customer';
import { useUpdateCustomer } from '@/features/customers/hooks/use-update-customer';
import { useAccounts } from '@/features/accounts/hooks/use-accounts';
import { AccountCard } from '@/features/accounts/components/account-card';
import { getApiErrorMessage } from '@/lib/error-messages';

const adminRoles = ['ADMIN'] as const;

export default function CustomerDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const customerQuery = useCustomer(id);
  const accountsQuery = useAccounts({ customerId: id });
  const updateMutation = useUpdateCustomer();
  const [serverError, setServerError] = useState<string | null>(null);
  const customer = customerQuery.data;

  async function update(values: UpdateCustomerInput) {
    setServerError(null);
    try {
      await updateMutation.mutateAsync({ id, input: values });
    } catch (error: unknown) {
      setServerError(getApiErrorMessage(error, 'Müşteri bilgileri kaydedilemedi.'));
    }
  }

  return (
    <RequireAuth allowedRoles={adminRoles}>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{ justifyContent: 'space-between', gap: 2 }}
        >
          <Stack spacing={0.5}>
            <Typography variant="overline" color="secondary.main">
              MÜŞTERİ KARTI
            </Typography>
            <Typography variant="h2" component="h1">
              {customer ? `${customer.firstName} ${customer.lastName}` : 'Müşteri detayı'}
            </Typography>
            {customer && <Typography color="text.secondary">{customer.email}</Typography>}
          </Stack>
          <Button component={Link} href="/admin/customers" variant="outlined">
            Listeye dön
          </Button>
        </Stack>

        {customerQuery.isLoading && <Skeleton variant="rounded" height={260} />}
        {customerQuery.isError && (
          <Alert
            severity="error"
            action={<Button onClick={() => void customerQuery.refetch()}>Tekrar dene</Button>}
          >
            Müşteri bilgileri yüklenemedi.
          </Alert>
        )}

        {customer && (
          <>
            <Paper elevation={0} sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: '12px' }}>
              <Stack spacing={2}>
                <Typography variant="h3">Profil bilgileri</Typography>
                {serverError && <Alert severity="error">{serverError}</Alert>}
                <CustomerForm
                  mode="update"
                  customer={customer}
                  pending={updateMutation.isPending}
                  onSubmit={(values) => {
                    void update(values);
                  }}
                />
              </Stack>
            </Paper>
            <Stack spacing={2}>
              <Typography variant="h3">
                Hesapları ({accountsQuery.data?.length ?? customer.accountCount ?? 0})
              </Typography>
              {accountsQuery.isLoading && <Skeleton variant="rounded" height={180} />}
              {accountsQuery.isError && (
                <Alert severity="error">Müşteri hesapları yüklenemedi.</Alert>
              )}
              {accountsQuery.isSuccess && accountsQuery.data.length === 0 && (
                <Paper elevation={0} sx={{ p: 3, borderRadius: '12px' }}>
                  <Typography color="text.secondary">Bu müşterinin henüz hesabı yok.</Typography>
                </Paper>
              )}
              {accountsQuery.isSuccess && accountsQuery.data.length > 0 && (
                <Stack
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                    gap: 2,
                  }}
                >
                  {accountsQuery.data.map((account) => (
                    <AccountCard key={account.id} account={account} showFullNumber />
                  ))}
                </Stack>
              )}
            </Stack>
          </>
        )}
      </Stack>
    </RequireAuth>
  );
}
