import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import type { PublicAccount } from '@fintrack/shared';
import { formatAmount } from '@/lib/format-amount';

type AccountCardProps = {
  account: PublicAccount;
  showFullNumber?: boolean;
};

export function AccountCard({ account, showFullNumber = false }: AccountCardProps) {
  const accountNumber = showFullNumber
    ? account.accountNumber.replace(/(\d{4})(?=\d)/g, '$1 ')
    : `•••• •••• •••• ${account.accountNumber.slice(-4)}`;

  return (
    <Paper
      elevation={0}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        p: { xs: 2.5, md: 3 },
        borderRadius: '12px',
        bgcolor: 'background.paper',
        '&::after': {
          position: 'absolute',
          right: -30,
          bottom: -55,
          width: 150,
          height: 150,
          borderRadius: '50%',
          bgcolor: 'rgba(23, 74, 66, 0.055)',
          content: '""',
        },
      }}
    >
      <Stack spacing={3}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="overline" color="text.secondary">
              ÖDEME HESABI
            </Typography>
            <Typography
              sx={{
                mt: 0.5,
                fontFamily: 'var(--font-dm-mono), monospace',
                fontSize: '0.85rem',
                letterSpacing: '0.06em',
              }}
            >
              {accountNumber}
            </Typography>
            {showFullNumber && account.owner && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                Müşteri: {account.owner.firstName} {account.owner.lastName}
              </Typography>
            )}
          </Box>
          <Chip
            size="small"
            label={account.status === 'ACTIVE' ? 'AKTİF' : 'PASİF'}
            color={account.status === 'ACTIVE' ? 'success' : 'default'}
          />
        </Stack>

        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Kullanılabilir bakiye
          </Typography>
          <Typography
            component="p"
            sx={{
              mt: 0.4,
              fontSize: { xs: '1.8rem', md: '2.15rem' },
              fontWeight: 750,
              letterSpacing: '-0.06em',
            }}
          >
            {formatAmount(account.balance, account.currency)}
          </Typography>
        </Box>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ position: 'relative', zIndex: 1 }}
        >
          {account.currency} hesabı ·{' '}
          {showFullNumber
            ? 'Tam hesap numarası yönetici görünümünde gösterilir'
            : 'Hesap numarasının son 4 hanesi gösterilir'}
        </Typography>
      </Stack>
    </Paper>
  );
}
