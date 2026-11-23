const MOD = 10;

export function isValidNationalId(value: string): boolean {
  if (!/^\d{11}$/.test(value) || value[0] === '0') return false;

  const digit = (index: number) => value.charCodeAt(index) - 48;
  const oddSum = digit(0) + digit(2) + digit(4) + digit(6) + digit(8);
  const evenSum = digit(1) + digit(3) + digit(5) + digit(7);

  const digit10 = (((oddSum * 7 - evenSum) % MOD) + MOD) % MOD;
  let digit11 = 0;
  for (let index = 0; index < 10; index += 1) digit11 += digit(index);
  digit11 %= MOD;

  return digit(9) === digit10 && digit(10) === digit11;
}
