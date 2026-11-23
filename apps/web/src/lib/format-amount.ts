import type { Currency } from '@fintrack/shared';

const formatters = new Map<Currency, Intl.NumberFormat>();

function getFormatter(currency: Currency): Intl.NumberFormat {
  const existing = formatters.get(currency);
  if (existing) return existing;

  const formatter = new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  formatters.set(currency, formatter);
  return formatter;
}

export function formatAmount(amount: string, currency: Currency): string {
  const isNegative = amount.startsWith('-');
  const unsignedAmount = isNegative ? amount.slice(1) : amount;
  const [integerPart = '0', decimalPart = ''] = unsignedAmount.split('.');
  const exactFraction = decimalPart.padEnd(2, '0').slice(0, 2);
  const whole = BigInt(integerPart);
  const isNonZero = whole > 0n || /[1-9]/.test(exactFraction);
  const formattedWhole = isNegative && isNonZero ? (whole === 0n ? -1n : -whole) : whole;

  return getFormatter(currency)
    .formatToParts(formattedWhole)
    .map((part) => {
      if (part.type === 'fraction') return exactFraction;
      if (isNegative && isNonZero && whole === 0n && part.type === 'integer') return '0';
      return part.value;
    })
    .join('');
}
