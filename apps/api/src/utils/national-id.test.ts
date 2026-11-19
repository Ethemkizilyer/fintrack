import { describe, expect, it } from 'vitest';
import { isValidNationalId } from './national-id';

describe('isValidNationalId', () => {
  it.each(['12345678950', '98765432150', '11111111110'])('accepts valid id %s', (id) => {
    expect(isValidNationalId(id)).toBe(true);
  });

  it('rejects wrong checksum', () => {
    expect(isValidNationalId('12345678951')).toBe(false);
    expect(isValidNationalId('11111111111')).toBe(false);
  });

  it('rejects ids starting with 0', () => {
    expect(isValidNationalId('01234567890')).toBe(false);
  });

  it('rejects wrong length', () => {
    expect(isValidNationalId('1234567890')).toBe(false);
    expect(isValidNationalId('123456789500')).toBe(false);
  });

  it('rejects non-digit input', () => {
    expect(isValidNationalId('1234567895a')).toBe(false);
    expect(isValidNationalId('')).toBe(false);
  });
});
