import type { ApiSuccess, AuthSession, LoginInput, PublicUser } from '@fintrack/shared';
import { apiClient, authClient, refreshAuthSession } from '@/lib/api-client';
import { useAuthStore } from '../auth.store';

export async function login(input: LoginInput): Promise<AuthSession> {
  const { data } = await authClient.post<ApiSuccess<AuthSession>>('/auth/login', input);
  useAuthStore.getState().setSession(data.data);
  return data.data;
}

export async function refreshSession(): Promise<AuthSession> {
  return refreshAuthSession();
}

export async function logout(): Promise<void> {
  try {
    await authClient.post('/auth/logout');
  } finally {
    useAuthStore.getState().clearSession();
  }
}

export async function getCurrentUser(): Promise<PublicUser> {
  const { data } = await apiClient.get<ApiSuccess<PublicUser>>('/auth/me');
  useAuthStore.getState().setUser(data.data);
  return data.data;
}
