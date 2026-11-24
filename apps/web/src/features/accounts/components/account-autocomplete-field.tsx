'use client';

import { useEffect, useMemo, useState, type Ref } from 'react';
import { Autocomplete, Box, Stack, TextField, Typography } from '@mui/material';
import type { PublicAccount } from '@fintrack/shared';
import { formatAmount } from '@/lib/format-amount';
import { useAccountById, useAccountOptions } from '../hooks/use-accounts';

const SEARCH_DEBOUNCE_MS = 300;
const OPTION_LIMIT = 20;

type AccountAutocompleteFieldProps = {
  value: string;
  onChange: (accountId: string) => void;
  label: string;
  status?: 'ACTIVE' | 'PASSIVE';
  error?: boolean;
  helperText?: string;
  placeholder?: string;
  autoSelectFirst?: boolean;
  onSelectionChange?: (account: PublicAccount | null) => void;
  inputRef?: Ref<HTMLInputElement>;
  onBlur?: () => void;
};

function getAccountLabel(account: PublicAccount): string {
  const lastDigits = account.accountNumber.slice(-4);
  const owner = account.owner ? `${account.owner.firstName} ${account.owner.lastName} · ` : '';
  return `${owner}${account.currency} · •••• ${lastDigits} · ${formatAmount(account.balance, account.currency)}`;
}

export function AccountAutocompleteField({
  value,
  onChange,
  label,
  status,
  error = false,
  helperText,
  placeholder,
  autoSelectFirst = false,
  onSelectionChange,
  inputRef,
  onBlur,
}: AccountAutocompleteFieldProps) {
  const [inputSearch, setInputSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<PublicAccount | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setDebouncedSearch(inputSearch.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [inputSearch]);

  const normalizedInput = inputSearch.trim();
  const searchPending = normalizedInput.length >= 2 && normalizedInput !== debouncedSearch;
  const accountsQuery = useAccountOptions(debouncedSearch, status);
  const accountOptions =
    normalizedInput.length === 1 || searchPending ? [] : (accountsQuery.data ?? []);
  const accountFromOptions = accountOptions.find((account) => account.id === value);
  const shouldFetchSelected =
    Boolean(value) && selectedAccount?.id !== value && !accountFromOptions;
  const selectedAccountQuery = useAccountById(shouldFetchSelected ? value : undefined);
  const resolvedSelection =
    (selectedAccount?.id === value ? selectedAccount : null) ??
    accountFromOptions ??
    selectedAccountQuery.data ??
    null;

  const options = useMemo(() => {
    if (
      !resolvedSelection ||
      accountOptions.some((account) => account.id === resolvedSelection.id)
    ) {
      return accountOptions;
    }
    return [resolvedSelection, ...accountOptions];
  }, [accountOptions, resolvedSelection]);

  useEffect(() => {
    if (!value) {
      if (selectedAccount) {
        setSelectedAccount(null);
        onSelectionChange?.(null);
      }
      return;
    }

    if (selectedAccount?.id === value) return;

    const account =
      accountOptions.find((item) => item.id === value) ??
      (selectedAccountQuery.data?.id === value ? selectedAccountQuery.data : null);
    if (account) {
      setSelectedAccount(account);
      onSelectionChange?.(account);
    }
  }, [accountOptions, onSelectionChange, selectedAccount, selectedAccountQuery.data, value]);

  useEffect(() => {
    if (!autoSelectFirst || value || accountsQuery.isFetching || accountOptions.length === 0)
      return;

    const firstAccount = accountOptions[0];
    if (!firstAccount) return;
    setSelectedAccount(firstAccount);
    onSelectionChange?.(firstAccount);
    onChange(firstAccount.id);
  }, [
    accountOptions,
    accountsQuery.isFetching,
    autoSelectFirst,
    onChange,
    onSelectionChange,
    value,
  ]);

  const noOptionsText =
    normalizedInput.length === 1
      ? 'Arama için en az 2 karakter girin.'
      : 'Eşleşen hesap bulunamadı.';
  const defaultHelperText =
    accountOptions.length >= OPTION_LIMIT
      ? 'İlk 20 sonuç gösterilir. Daha fazla sonuç için aramanızı daraltın.'
      : 'En az 2 karakterle arayın; en fazla 20 sonuç gösterilir.';

  return (
    <Autocomplete
      options={options}
      value={resolvedSelection}
      loading={accountsQuery.isFetching || searchPending || selectedAccountQuery.isFetching}
      loadingText="Hesaplar aranıyor…"
      noOptionsText={noOptionsText}
      getOptionLabel={getAccountLabel}
      isOptionEqualToValue={(option, selected) => option.id === selected.id}
      filterOptions={(availableOptions) => availableOptions}
      disableClearable={autoSelectFirst}
      openOnFocus
      onBlur={() => onBlur?.()}
      onChange={(_event, account) => {
        setSelectedAccount(account);
        onSelectionChange?.(account);
        setInputSearch('');
        onChange(account?.id ?? '');
      }}
      onInputChange={(_event, nextInput, reason) => {
        if (reason === 'input' || reason === 'clear') {
          setInputSearch(nextInput);
        }
      }}
      renderOption={(optionProps, account) => (
        <Box component="li" {...optionProps} key={account.id}>
          <Stack
            direction="row"
            spacing={2}
            sx={{ alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {account.currency} · •••• {account.accountNumber.slice(-4)}
              </Typography>
              {account.owner && (
                <Typography variant="caption" color="text.secondary">
                  {account.owner.firstName} {account.owner.lastName}
                </Typography>
              )}
            </Box>
            <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
              {formatAmount(account.balance, account.currency)}
            </Typography>
          </Stack>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          inputRef={inputRef}
          label={label}
          placeholder={placeholder}
          fullWidth
          error={error}
          helperText={helperText ?? defaultHelperText}
        />
      )}
    />
  );
}
