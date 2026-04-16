/** Valores de periodicidad de tasa según API .NET (minúsculas, inglés). */
export const INTEREST_RATE_PERIODS = [
  "daily",
  "weekly",
  "monthly",
  "annual",
] as const;

export type InterestRatePeriod = (typeof INTEREST_RATE_PERIODS)[number];

export function normalizeInterestRatePeriod(
  raw: string | null | undefined,
): InterestRatePeriod | null {
  if (raw == null || String(raw).trim() === "") return null;
  const n = String(raw).trim().toLowerCase();
  return INTEREST_RATE_PERIODS.includes(n as InterestRatePeriod)
    ? (n as InterestRatePeriod)
    : null;
}

/**
 * Etiqueta del campo numérico de tasa. El significado (diario, semanal, etc.)
 * lo indica la **periodicidad** elegida al lado; no repetimos «anual» aquí.
 */
export function labelInterestPercentForPeriod(
  _period?: string | null,
): string {
  return "Porcentaje de interés (%)";
}

/** Texto legible de la periodicidad (detalle / tablas). */
export function formatInterestRatePeriodEs(
  period: string | null | undefined,
): string {
  const p = normalizeInterestRatePeriod(period);
  if (!p) return "—";
  switch (p) {
    case "daily":
      return "Diario";
    case "weekly":
      return "Semanal";
    case "monthly":
      return "Mensual";
    case "annual":
      return "Anual";
    default:
      return String(period);
  }
}

/** Una línea para detalle: «5 % (Mensual)» o «—». */
export function formatLoanInterestLine(
  interestPercent: number | null | undefined,
  interestRatePeriod: string | null | undefined,
  legacyAnnualPercent?: number | null,
): string {
  const pct = interestPercent ?? legacyAnnualPercent ?? null;
  if (pct == null) return "—";
  const p = normalizeInterestRatePeriod(interestRatePeriod) ?? "annual";
  return `${pct} % (${formatInterestRatePeriodEs(p)})`;
}
