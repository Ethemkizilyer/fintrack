'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Alert,
  Button,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import type { ListCustomersQuery } from '@fintrack/shared';
import { RequireAuth } from '@/features/auth/components/require-auth';
import { useCustomers } from '@/features/customers/hooks/use-customers';

const PAGE_SIZE = 20;
const adminRoles = ['ADMIN'] as const;

export default function AdminCustomersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? '';
  const [searchInput, setSearchInput] = useState(search);

  const query: ListCustomersQuery = {
    page,
    limit: PAGE_SIZE,
    sort: 'createdAt',
    order: 'desc',
    ...(search ? { search } : {}),
    ...(status === 'ACTIVE' || status === 'PASSIVE' ? { status } : {}),
  };
  const customersQuery = useCustomers(query);

  function updateFilters(nextSearch: string, nextStatus: string) {
    const params = new URLSearchParams();
    if (nextSearch) params.set('search', nextSearch);
    if (nextStatus) params.set('status', nextStatus);
    router.replace(`/admin/customers${params.size ? `?${params.toString()}` : ''}`);
  }

  function changePage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(nextPage));
    router.replace(`/admin/customers?${params.toString()}`);
  }

  return (
    <RequireAuth allowedRoles={adminRoles}>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{ alignItems: { sm: 'flex-end' }, justifyContent: 'space-between' }}
          spacing={2}
        >
          <BoxTitle />
          <Button component={Link} href="/admin/customers/new" variant="contained">
            Müşteri ekle
          </Button>
        </Stack>

        <Paper elevation={0} sx={{ p: 2, borderRadius: '12px' }}>
          <Stack
            component="form"
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            onSubmit={(event) => {
              event.preventDefault();
              updateFilters(searchInput.trim(), status);
            }}
          >
            <TextField
              label="Ad, soyad veya e-posta ara"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              fullWidth
            />
            <TextField
              select
              label="Durum"
              value={status}
              onChange={(event) => updateFilters(searchInput.trim(), event.target.value)}
              sx={{ minWidth: { sm: 180 } }}
            >
              <MenuItem value="">Tümü</MenuItem>
              <MenuItem value="ACTIVE">Aktif</MenuItem>
              <MenuItem value="PASSIVE">Pasif</MenuItem>
            </TextField>
            <Button type="submit" variant="outlined">
              Ara
            </Button>
          </Stack>
        </Paper>

        {customersQuery.isLoading && <Skeleton variant="rounded" height={300} />}
        {customersQuery.isError && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" onClick={() => void customersQuery.refetch()}>
                Tekrar dene
              </Button>
            }
          >
            Müşteri listesi yüklenemedi.
          </Alert>
        )}
        {customersQuery.isSuccess && customersQuery.data.customers.length === 0 && (
          <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: '12px' }}>
            <Typography variant="h3">Müşteri bulunamadı</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Arama ölçütlerini değiştirebilir veya yeni müşteri ekleyebilirsiniz.
            </Typography>
          </Paper>
        )}
        {customersQuery.isSuccess && customersQuery.data.customers.length > 0 && (
          <>
            <Paper elevation={0} sx={{ overflowX: 'auto', borderRadius: '12px' }}>
              <Table aria-label="Müşteri listesi">
                <TableHead>
                  <TableRow>
                    <TableCell>Müşteri</TableCell>
                    <TableCell>E-posta</TableCell>
                    <TableCell>Telefon</TableCell>
                    <TableCell>Durum</TableCell>
                    <TableCell align="right">İşlem</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {customersQuery.data.customers.map((customer) => (
                    <TableRow key={customer.id} hover>
                      <TableCell>
                        {customer.firstName} {customer.lastName}
                      </TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>{customer.phone}</TableCell>
                      <TableCell>{customer.status === 'ACTIVE' ? 'Aktif' : 'Pasif'}</TableCell>
                      <TableCell align="right">
                        <Button
                          component={Link}
                          href={`/admin/customers/${customer.id}`}
                          size="small"
                        >
                          Detay
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
            <Stack
              direction="row"
              spacing={1.5}
              sx={{ justifyContent: 'flex-end', alignItems: 'center' }}
            >
              <Typography variant="body2" color="text.secondary">
                Sayfa {page} / {customersQuery.data.meta?.totalPages ?? 1}
              </Typography>
              <Button
                disabled={page <= 1 || customersQuery.isPlaceholderData}
                onClick={() => changePage(page - 1)}
              >
                Önceki
              </Button>
              <Button
                disabled={
                  page >= (customersQuery.data.meta?.totalPages ?? 1) ||
                  customersQuery.isPlaceholderData
                }
                onClick={() => changePage(page + 1)}
              >
                Sonraki
              </Button>
            </Stack>
          </>
        )}
      </Stack>
    </RequireAuth>
  );
}

function BoxTitle() {
  return (
    <Stack spacing={0.5}>
      <Typography variant="overline" color="secondary.main">
        YÖNETİM
      </Typography>
      <Typography variant="h2" component="h1">
        Müşteriler
      </Typography>
      <Typography color="text.secondary">Müşteri kayıtlarını arayın ve yönetin.</Typography>
    </Stack>
  );
}
