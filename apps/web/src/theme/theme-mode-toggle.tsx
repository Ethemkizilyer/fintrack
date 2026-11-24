'use client';

import { IconButton, SvgIcon, Tooltip } from '@mui/material';
import { useColorScheme } from '@mui/material/styles';

export function ThemeModeToggle() {
  const { mode, systemMode, setMode } = useColorScheme();
  const activeMode = mode === 'system' ? systemMode : mode;
  const isDarkMode = activeMode === 'dark';
  const canToggle = activeMode !== undefined;
  const label = canToggle
    ? isDarkMode
      ? 'Açık temaya geç'
      : 'Koyu temaya geç'
    : 'Tema yükleniyor';

  return (
    <Tooltip title={label}>
      <span>
        <IconButton
          aria-label={label}
          disabled={!canToggle}
          onClick={() => setMode(isDarkMode ? 'light' : 'dark')}
          size="small"
          sx={{
            width: 40,
            height: 40,
            border: '1px solid',
            borderColor: 'divider',
            color: 'text.primary',
          }}
        >
          <SvgIcon fontSize="small" viewBox="0 0 24 24" aria-hidden="true">
            {isDarkMode ? (
              <path
                d="M12 3v2m0 14v2M5.64 5.64l1.42 1.42m9.88 9.88 1.42 1.42M3 12h2m14 0h2M5.64 18.36l1.42-1.42m9.88-9.88 1.42-1.42M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.7"
              />
            ) : (
              <path d="M9.37 5.51a7 7 0 0 0 9.12 9.12A9 9 0 1 1 9.37 5.51Z" />
            )}
          </SvgIcon>
        </IconButton>
      </span>
    </Tooltip>
  );
}
