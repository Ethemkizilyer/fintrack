import type { ListAccountsQuery } from '@fintrack/shared';

export const accountKeys = {
  all: ['accounts'] as const,
  list: (query: ListAccountsQuery = {}) => [...accountKeys.all, query] as const,
  detail: (id: string) => [...accountKeys.all, 'detail', id] as const,
};
