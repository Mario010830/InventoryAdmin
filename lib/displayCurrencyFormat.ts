/** Conversión solo visual: valores en BD siguen siendo CUP (base). */

export function cupToDisplayAmount(cup: number, exchangeRate: number): number {
  if (!Number.isFinite(cup) || !Number.isFinite(exchangeRate) || exchangeRate <= 0) return 0;
  return cup / exchangeRate;
}

export function roundPriceDecimals(n: number, decimals: number): number {
  const d = Math.min(8, Math.max(0, Math.floor(decimals)));
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

/** Ej. 3.08 USD — número formateado + espacio + código ISO. */
export function formatAmountWithCode(
  amount: number,
  code: string,
  decimals: number,
  locale = "es-ES",
): string {
  const d = Math.min(8, Math.max(0, Math.floor(decimals)));
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(amount);
  return `${formatted} ${code}`;
}
