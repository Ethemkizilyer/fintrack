import { describe, expect, it } from 'vitest';
import { amountSchema, formatAmount, toDecimal } from './money';

describe('amountSchema', () => {
  it.each(['0.01', '1500.50', '999999999999999.99', '5', '0.1'])(
    'accepts valid amount %s',
    (value) => {
      expect(amountSchema.safeParse(value).success).toBe(true);
    },
  );

  it.each(['0', '0.00', '-5', '1.234', '10.', '.50', 'abc', '', ' 10', '1e5', '1000000000000000'])(
    'rejects invalid amount %s',
    (value) => {
      expect(amountSchema.safeParse(value).success).toBe(false);
    },
  );
});

describe('Decimal arithmetic', () => {
  it('adds 0.1 + 0.2 exactly', () => {
    const sum = toDecimal('0.1').plus(toDecimal('0.2'));
    expect(formatAmount(sum)).toBe('0.30');
  });

  it('keeps full precision on big numbers', () => {
    const sum = toDecimal('999999999999999.99').plus('0.01');
    expect(formatAmount(sum)).toBe('1000000000000000.00');
  });
});
