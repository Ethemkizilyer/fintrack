export function normalizeLocalizedAmount(value: string): string {
  const sanitized = value.trim().replace(/[^\d.,]/g, '');
  if (!sanitized) return '';

  const commaIndex = sanitized.lastIndexOf(',');
  if (commaIndex >= 0) {
    const integer = sanitized.slice(0, commaIndex).replace(/[.,]/g, '') || '0';
    const fraction = sanitized.slice(commaIndex + 1).replace(/[.,]/g, '');
    return `${integer}.${fraction}`;
  }

  const dotIndex = sanitized.lastIndexOf('.');
  if (dotIndex >= 0 && sanitized.length - dotIndex - 1 <= 2) {
    const integer = sanitized.slice(0, dotIndex).replace(/\./g, '') || '0';
    const fraction = sanitized.slice(dotIndex + 1);
    return `${integer}.${fraction}`;
  }

  return sanitized.replace(/\D/g, '');
}

export function formatLocalizedAmountInput(value: string): string {
  const normalized = normalizeLocalizedAmount(value);
  if (!/^\d{1,15}(?:\.\d{0,2})?$/.test(normalized)) return value;

  const [integer = '', fraction] = normalized.split('.');
  const groupedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return fraction === undefined ? groupedInteger : `${groupedInteger},${fraction}`;
}

export function formatTurkishPhone(value: string): string {
  const trimmed = value.trim();
  let digits = value.replace(/\D/g, '');
  if (trimmed.startsWith('+') && !digits.startsWith('90')) return `+${digits}`;
  if (digits.startsWith('90')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  digits = digits.slice(0, 10);

  if (!digits) return '';
  const groups = [
    digits.slice(0, 3),
    digits.slice(3, 6),
    digits.slice(6, 8),
    digits.slice(8, 10),
  ].filter(Boolean);
  return `+90 ${groups.join(' ')}`;
}
