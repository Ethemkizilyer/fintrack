import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#174A42',
      dark: '#10352F',
      light: '#3E766B',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#C27A4A',
      dark: '#995B36',
      light: '#E5A77C',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#267A5A',
    },
    error: {
      main: '#B44743',
    },
    background: {
      default: '#F4F2EC',
      paper: '#FFFEFA',
    },
    text: {
      primary: '#172B27',
      secondary: '#687772',
    },
    divider: 'rgba(23, 43, 39, 0.12)',
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: 'var(--font-manrope), sans-serif',
    h1: {
      fontSize: 'clamp(3.25rem, 7vw, 6.25rem)',
      fontWeight: 700,
      lineHeight: 0.99,
      letterSpacing: '-0.075em',
    },
    h2: {
      fontSize: 'clamp(2rem, 4vw, 3.5rem)',
      fontWeight: 650,
      lineHeight: 1.08,
      letterSpacing: '-0.055em',
    },
    h3: {
      fontSize: '1.2rem',
      fontWeight: 700,
      letterSpacing: '-0.025em',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.75,
    },
    button: {
      fontWeight: 700,
      textTransform: 'none',
    },
    overline: {
      fontFamily: 'var(--font-dm-mono), monospace',
      fontSize: '0.68rem',
      fontWeight: 500,
      letterSpacing: '0.12em',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 48,
          borderRadius: 10,
          paddingInline: 22,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          minHeight: 56,
          borderRadius: 10,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 12,
          border: '1px solid rgba(23, 43, 39, 0.08)',
        },
      },
    },
  },
});
