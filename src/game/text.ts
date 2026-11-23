/** 1 монета, 2 монеты, 5 монет. */
export function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(Math.trunc(n));
  const n10 = abs % 10;
  const n100 = abs % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return few;
  return many;
}

export function coinsWord(n: number): string {
  return plural(n, 'монета', 'монеты', 'монет');
}
