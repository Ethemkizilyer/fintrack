import { create } from 'zustand';
import type { AuthSession, PublicUser } from '@fintrack/shared';

type AuthState = {
  accessToken: string | null;
  user: PublicUser | null;
  isInitialized: boolean;
  setSession: (session: AuthSession) => void;
  setUser: (user: PublicUser) => void;
  markInitialized: () => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isInitialized: false,
  setSession: ({ accessToken, user }) => set({ accessToken, user, isInitialized: true }),
  setUser: (user) => set({ user }),
  markInitialized: () => set({ isInitialized: true }),
  clearSession: () => set({ accessToken: null, user: null, isInitialized: true }),
}));
