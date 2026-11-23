import type { ListCustomersQuery } from '@fintrack/shared';

export const customerKeys = {
  all: ['customers'] as const,
  list: (query: ListCustomersQuery) => [...customerKeys.all, 'list', query] as const,
  detail: (id: string) => [...customerKeys.all, 'detail', id] as const,
};
