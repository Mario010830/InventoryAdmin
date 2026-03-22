/** Moneda de visualización (inventario, ventas, catálogo, planes). */
export const DISPLAY_CURRENCY = "CUP" as const;

export function formatDisplayCurrency(
  value: number,
  locale = "es-ES",
  options?: { minFractionDigits?: number; maxFractionDigits?: number },
): string {
  /** Por defecto: sin ,00 en enteros; hasta 2 decimales si el valor los tiene (ej. 980,01 CUP). */
  const min = options?.minFractionDigits ?? 0;
  const max = options?.maxFractionDigits ?? 2;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: DISPLAY_CURRENCY,
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  }).format(value);
}
