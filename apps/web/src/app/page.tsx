import { Box, Button, Chip, Container, Divider, Paper, Stack, Typography } from '@mui/material';
import { apiDocsUrl } from '@/lib/env';
import { ThemeModeToggle } from '@/theme/theme-mode-toggle';

const principles = [
  {
    index: '01',
    title: 'Tek doğruluk kaynağı',
    description:
      'Her hareket, işlem kaydı ve değiştirilemeyen ledger girdileriyle izlenebilir kalır.',
  },
  {
    index: '02',
    title: 'Tutarlı para akışı',
    description:
      'Satır kilitleri ve atomik veritabanı transaction’ları, eşzamanlı işlemlerde bakiyeyi korur.',
  },
  {
    index: '03',
    title: 'Güvenli tekrar denemesi',
    description:
      'Idempotency anahtarı, aynı isteğin ağ hatası veya çift tıklama yüzünden iki kez işlenmesini önler.',
  },
];

export default function HomePage() {
  return (
    <Box
      component="main"
      className="site-shell"
      sx={{
        minHeight: '100vh',
        color: 'text.primary',
        bgcolor: 'background.default',
        backgroundImage: 'inherit',
      }}
    >
      <Container maxWidth="lg">
        <Box
          component="header"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            py: { xs: 2.5, md: 3.5 },
          }}
        >
          <Stack direction="row" spacing={1.4} sx={{ alignItems: 'center' }}>
            <Box
              aria-hidden="true"
              sx={{
                display: 'grid',
                width: 38,
                height: 38,
                placeItems: 'center',
                borderRadius: '13px 13px 13px 4px',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                fontSize: '1rem',
                fontWeight: 800,
              }}
            >
              F
            </Box>
            <Typography variant="h3" sx={{ fontSize: '1.05rem', letterSpacing: '-0.04em' }}>
              FinTrack
            </Typography>
          </Stack>

          <Stack direction="row" spacing={{ xs: 1, sm: 2 }} sx={{ alignItems: 'center' }}>
            <ThemeModeToggle />
            <Button
              component="a"
              href="/login"
              size="small"
              variant="contained"
              color="primary"
              style={{ color: 'var(--primary-action-text)' }}
            >
              Giriş yap
            </Button>
            <Button
              component="a"
              href="#prensipler"
              color="inherit"
              sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
            >
              Yaklaşımımız
            </Button>
            <Button
              component="a"
              href={apiDocsUrl}
              target="_blank"
              rel="noreferrer"
              variant="outlined"
              color="primary"
              sx={{ minWidth: { xs: 54, sm: 'auto' } }}
              endIcon={
                <Box component="span" aria-hidden="true">
                  ↗
                </Box>
              }
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                API dokümantasyonu
              </Box>
              <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                API
              </Box>
            </Button>
          </Stack>
        </Box>

        <Box className="hero-grid">
          <Stack className="hero-copy" spacing={3} sx={{ alignItems: 'flex-start' }}>
            <Chip
              label="FİNANSAL İŞLEMLER, DAHA NET"
              color="primary"
              variant="outlined"
              sx={{
                height: 32,
                borderColor: 'divider',
                bgcolor: 'background.paper',
                '& .MuiChip-label': {
                  px: 1.5,
                  fontFamily: 'var(--font-dm-mono), monospace',
                  fontSize: '0.64rem',
                  letterSpacing: '0.08em',
                },
              }}
            />
            <Typography variant="h1" component="h1" sx={{ maxWidth: 760 }}>
              Paranın her
              <br />
              hareketinde
              <br />
              <Box component="span" sx={{ color: 'primary.main' }}>
                net kontrol.
              </Box>
            </Typography>
            <Typography
              color="text.secondary"
              variant="body1"
              sx={{ maxWidth: 520, fontSize: { xs: '1rem', md: '1.12rem' } }}
            >
              Hesapları, transferleri ve işlem geçmişini güvenilir bir finansal altyapı üzerinde
              yönetin. Her hareket kayıtlı, her bakiye tutarlı.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ pt: 0.5 }}>
              <Button
                component="a"
                href={apiDocsUrl}
                target="_blank"
                rel="noreferrer"
                variant="contained"
                color="primary"
                style={{ color: 'var(--primary-action-text)' }}
                endIcon={
                  <Box component="span" aria-hidden="true">
                    ↗
                  </Box>
                }
              >
                API’yi keşfet
              </Button>
              <Button component="a" href="#prensipler" variant="text" color="inherit">
                Güvenlik yaklaşımını gör
              </Button>
            </Stack>
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center', pt: 1, color: 'text.secondary' }}
            >
              <Box
                aria-hidden="true"
                sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: 'success.main' }}
              />
              <Typography variant="caption">Her para hareketi atomik ve izlenebilir</Typography>
            </Stack>
          </Stack>

          <Paper
            className="hero-card"
            elevation={0}
            sx={{
              overflow: 'hidden',
              p: { xs: 2.5, sm: 3.5 },
              borderRadius: '20px',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              boxShadow: '0 32px 90px rgba(0, 0, 0, 0.18)',
            }}
          >
            <Stack spacing={3}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography
                    variant="overline"
                    sx={{ color: 'primary.contrastText', opacity: 0.72 }}
                  >
                    İŞLEM AKIŞI
                  </Typography>
                  <Typography variant="h3" sx={{ mt: 0.5 }}>
                    Baştan sona kayıtlı
                  </Typography>
                </Box>
                <Box
                  aria-hidden="true"
                  sx={{
                    width: 42,
                    height: 42,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: '50%',
                    border: '1px solid',
                    borderColor: 'divider',
                    color: 'primary.contrastText',
                    opacity: 0.72,
                    fontSize: '1.2rem',
                  }}
                >
                  ↗
                </Box>
              </Stack>

              <Divider sx={{ borderColor: 'divider' }} />

              <Stack spacing={0}>
                {[
                  ['01', 'İstek doğrulanır', 'Zod + Idempotency-Key'],
                  ['02', 'Hesaplar kilitlenir', 'Sıralı satır kilidi'],
                  ['03', 'Ledger’a yazılır', 'Tek DB transaction’ı'],
                ].map(([step, title, detail], index) => (
                  <Stack
                    key={step}
                    direction="row"
                    spacing={2}
                    sx={{
                      alignItems: 'flex-start',
                      py: 2.1,
                      borderBottom: index < 2 ? '1px solid' : 'none',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography
                      variant="overline"
                      sx={{ pt: 0.4, color: 'primary.contrastText', opacity: 0.72, minWidth: 30 }}
                    >
                      {step}
                    </Typography>
                    <Box>
                      <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.72 }}>
                        {detail}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>

              <Box
                sx={{
                  p: 2,
                  borderRadius: '12px',
                  bgcolor: 'action.hover',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography
                  variant="overline"
                  sx={{ color: 'primary.contrastText', opacity: 0.72 }}
                >
                  SONUÇ
                </Typography>
                <Stack
                  direction="row"
                  sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Typography sx={{ mt: 0.5, fontWeight: 650 }}>
                    Bakiye ve ledger tutarlı
                  </Typography>
                  <Chip
                    size="small"
                    label="TAMAMLANDI"
                    sx={{
                      bgcolor: 'action.selected',
                      color: 'primary.contrastText',
                      fontFamily: 'var(--font-dm-mono), monospace',
                      fontSize: '0.6rem',
                    }}
                  />
                </Stack>
              </Box>
            </Stack>
          </Paper>
        </Box>

        <Box id="prensipler" sx={{ pb: { xs: 8, md: 12 } }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{
              justifyContent: 'space-between',
              alignItems: { md: 'flex-end' },
              mb: 4,
            }}
          >
            <Box>
              <Typography variant="overline" color="secondary.main">
                TASARIM İLKELERİ
              </Typography>
              <Typography variant="h2" component="h2" sx={{ mt: 1, maxWidth: 560 }}>
                Güven, ayrıntılarda kurulur.
              </Typography>
            </Box>
            <Typography color="text.secondary" sx={{ maxWidth: 390 }}>
              FinTrack; işlem güvenliği, veri tutarlılığı ve anlaşılır bir kullanıcı deneyimi
              etrafında tasarlandı.
            </Typography>
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
              gap: 2,
            }}
          >
            {principles.map((principle) => (
              <Paper
                key={principle.index}
                className="principle-card"
                elevation={0}
                sx={{
                  p: { xs: 2.5, md: 3 },
                  borderRadius: '12px',
                  bgcolor: 'background.paper',
                }}
              >
                <Typography
                  variant="overline"
                  sx={{ color: 'secondary.main', fontSize: '0.72rem' }}
                >
                  {principle.index}
                </Typography>
                <Typography variant="h3" component="h3" sx={{ mt: 3, mb: 1 }}>
                  {principle.title}
                </Typography>
                <Typography color="text.secondary" variant="body2" sx={{ lineHeight: 1.8 }}>
                  {principle.description}
                </Typography>
              </Paper>
            ))}
          </Box>
        </Box>

        <Box
          component="footer"
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            gap: 1,
            py: 3,
            borderTop: '1px solid',
            borderColor: 'divider',
            color: 'text.secondary',
          }}
        >
          <Typography variant="caption">
            FinTrack · Finansal işlem ve para transferi sistemi
          </Typography>
          <Typography variant="caption">YUI Teknoloji teknik ödevi</Typography>
        </Box>
      </Container>
    </Box>
  );
}
