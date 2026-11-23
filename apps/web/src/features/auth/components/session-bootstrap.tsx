'use client';

import { useEffect } from 'react';
import { refreshSession } from '@/features/auth/api/auth.api';
import { useAuthStore } from '@/features/auth/auth.store';

export function SessionBootstrap() {
  const markInitialized = useAuthStore((state) => state.markInitialized);

  useEffect(() => {
    let isMounted = true;

    void refreshSession()
      .catch(() => undefined)
      .finally(() => {
        if (isMounted) markInitialized();
      });

    return () => {
      isMounted = false;
    };
  }, [markInitialized]);

  return null;
}
