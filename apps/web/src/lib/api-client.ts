import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { ApiSuccess, AuthSession } from '@fintrack/shared';
import { useAuthStore } from '@/features/auth/auth.store';
import { webEnv } from '@/lib/env';

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _authRetried?: boolean;
};

const clientOptions = {
  baseURL: webEnv.NEXT_PUBLIC_API_URL,
  headers: { Accept: 'application/json' },
  withCredentials: true,
};

export const authClient = axios.create(clientOptions);
export const apiClient = axios.create(clientOptions);

let refreshPromise: Promise<AuthSession> | null = null;

export function refreshAuthSession(): Promise<AuthSession> {
  if (!refreshPromise) {
    refreshPromise = authClient
      .post<ApiSuccess<AuthSession>>('/auth/refresh')
      .then(({ data }) => {
        useAuthStore.getState().setSession(data.data);
        return data.data;
      })
      .catch((error: unknown) => {
        if (
          axios.isAxiosError(error) &&
          (error.response?.status === 401 || error.response?.status === 403)
        ) {
          useAuthStore.getState().clearSession();
        }

        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

function refreshAccessToken(): Promise<string> {
  return refreshAuthSession().then((session) => session.accessToken);
}

apiClient.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;

  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!(error instanceof AxiosError)) {
      return Promise.reject(
        error instanceof Error ? error : new Error('Unexpected API client error', { cause: error }),
      );
    }

    const request = error.config as RetryableRequestConfig | undefined;
    if (error.response?.status !== 401 || !request || request._authRetried) {
      return Promise.reject(error);
    }

    request._authRetried = true;

    try {
      const accessToken = await refreshAccessToken();
      request.headers.set('Authorization', `Bearer ${accessToken}`);
      return await apiClient.request(request);
    } catch (refreshError) {
      return Promise.reject(
        refreshError instanceof Error
          ? refreshError
          : new Error('Session refresh failed', { cause: refreshError }),
      );
    }
  },
);
