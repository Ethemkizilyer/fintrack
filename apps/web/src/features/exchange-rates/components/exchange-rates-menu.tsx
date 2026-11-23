'use client';

import { useState } from 'react';
import { Alert, Box, Button, Chip, Popover, Skeleton, Stack, Typography } from '@mui/material';
import { useExchangeRates } from '../hooks/use-exchange-rates';

function formatRate(value: string): string {
  const [integer, fraction] = value.split('.');
  const grouped = (integer ?? value).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${grouped}${fraction ? `,${fraction}` : ''} ₺`;
}

function formatBulletinDate(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
}

function formatCheckedTime(value: string): string {
  return new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(value),
  );
}

export function ExchangeRatesMenu() {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const query = useExchangeRates();
  const open = Boolean(anchorEl);

  return (
    <>
      <Button
        aria-controls={open ? 'exchange-rates-popover' : undefined}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="TCMB döviz kurlarını görüntüle"
        variant="outlined"
        color="primary"
        size="small"
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{
          minWidth: { xs: 52, sm: 0 },
          minHeight: 38,
          px: { xs: 1, sm: 1.25 },
          borderColor: 'divider',
          borderRadius: '8px',
          textTransform: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        <Typography
          variant="caption"
          sx={{ display: { xs: 'inline', sm: 'none' }, fontWeight: 750 }}
        >
          Kurlar
        </Typography>
        <Stack
          direction="row"
          spacing={1}
          sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center' }}
        >
          <Typography variant="caption" sx={{ fontWeight: 800, color: 'secondary.main' }}>
            TCMB SATIŞ
          </Typography>
          <Typography variant="caption" color="text.primary">
            {query.data
              ? `USD ${formatRate(query.data.rates.find((rate) => rate.currency === 'USD')?.forexSelling ?? '—')} · EUR ${formatRate(query.data.rates.find((rate) => rate.currency === 'EUR')?.forexSelling ?? '—')}`
              : 'Kurları görüntüle'}
          </Typography>
        </Stack>
      </Button>

      <Popover
        id="exchange-rates-popover"
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            role: 'dialog',
            'aria-labelledby': 'exchange-rates-title',
            sx: { mt: 1, width: { xs: 320, sm: 390 }, borderRadius: '12px' },
          },
        }}
      >
        <Stack spacing={2} sx={{ p: 2.5 }}>
          <Stack
            direction="row"
            sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}
          >
            <Box>
              <Typography variant="overline" color="secondary.main">
                DÖVİZ GÖSTERGESİ
              </Typography>
              <Typography id="exchange-rates-title" variant="h3">
                TCMB kurları
              </Typography>
            </Box>
            {query.data && (
              <Chip
                size="small"
                color={query.data.isStale ? 'warning' : 'success'}
                label={
                  query.data.isStale ? 'Önceki bülten' : formatBulletinDate(query.data.bulletinDate)
                }
              />
            )}
          </Stack>

          {query.isPending && <Skeleton height={76} />}
          {query.isError && (
            <Alert
              severity="warning"
              action={
                <Button color="inherit" size="small" onClick={() => void query.refetch()}>
                  Tekrar dene
                </Button>
              }
            >
              Kur bilgisi alınamadı.
            </Alert>
          )}
          {query.data?.rates.map((rate) => (
            <Box
              key={rate.currency}
              sx={{
                display: 'grid',
                gridTemplateColumns: '0.7fr 1fr 1fr',
                alignItems: 'center',
                gap: 1,
                py: 1,
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography sx={{ fontWeight: 750 }}>
                {rate.unit} {rate.currency}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Alış {formatRate(rate.forexBuying)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Satış {formatRate(rate.forexSelling)}
              </Typography>
            </Box>
          ))}

          {query.data && (
            <Typography variant="caption" color="text.secondary">
              Son kontrol: {formatCheckedTime(query.data.fetchedAt)}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            TCMB günlük gösterge kurudur; işlem kuru değildir ve transferlerde kullanılmaz. Kontrol
            aralığı yaklaşık 15 dakikadır.
          </Typography>
        </Stack>
      </Popover>
    </>
  );
}
