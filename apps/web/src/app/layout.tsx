import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { DM_Mono, Manrope } from 'next/font/google';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import { AppProviders } from '@/providers/app-providers';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-manrope',
  display: 'swap',
});

const dmMono = DM_Mono({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-dm-mono',
  weight: ['400', '500'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'FinTrack — Finansal kontrol, net bir bakış',
    template: '%s | FinTrack',
  },
  description: 'Hesaplarınızı, para hareketlerinizi ve finansal raporlarınızı güvenle yönetin.',
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="tr">
      <body className={`${manrope.variable} ${dmMono.variable}`}>
        <InitColorSchemeScript defaultMode="system" />
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <AppProviders>{children}</AppProviders>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
