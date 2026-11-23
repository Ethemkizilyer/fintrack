import type { ReactNode } from 'react';
import { AppShell } from '@/features/auth/components/app-shell';
import { RequireAuth } from '@/features/auth/components/require-auth';

type ProtectedLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function ProtectedLayout({ children }: ProtectedLayoutProps) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
