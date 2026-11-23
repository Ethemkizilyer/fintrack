import { z } from 'zod';

const AMOUNT_PATTERN = /^\d{1,15}(\.\d{1,2})?$/;
const ZERO_AMOUNT_PATTERN = /^0+(?:\.0{1,2})?$/;

export const amountSchema = z
  .string()
  .regex(AMOUNT_PATTERN, 'Tutar en fazla 15 tam basamak ve 2 ondalık içerebilir')
  .refine((value) => !ZERO_AMOUNT_PATTERN.test(value), 'Tutar sıfırdan büyük olmalı');

export function compareMoneyAmounts(left: string, right: string): number {
  const [leftWhole = '0', leftFraction = ''] = left.split('.');
  const [rightWhole = '0', rightFraction = ''] = right.split('.');

  const normalizedLeftWhole = leftWhole.replace(/^0+(?=\d)/, '');
  const normalizedRightWhole = rightWhole.replace(/^0+(?=\d)/, '');

  if (normalizedLeftWhole.length !== normalizedRightWhole.length) {
    return normalizedLeftWhole.length > normalizedRightWhole.length ? 1 : -1;
  }

  if (normalizedLeftWhole !== normalizedRightWhole) {
    return normalizedLeftWhole > normalizedRightWhole ? 1 : -1;
  }

  const normalizedLeftFraction = leftFraction.padEnd(2, '0');
  const normalizedRightFraction = rightFraction.padEnd(2, '0');

  if (normalizedLeftFraction === normalizedRightFraction) return 0;
  return normalizedLeftFraction > normalizedRightFraction ? 1 : -1;
}
