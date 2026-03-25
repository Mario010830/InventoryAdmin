import { endOfDay, parse, startOfDay } from "date-fns";

/**
 * Convierte rango en fechas locales (yyyy-MM-dd) a ISO 8601 para query dateFrom/dateTo.
 * dateFrom = inicio del primer día; dateTo = fin del último día (hora local → toISOString).
 */
export function ymdRangeToIsoRange(
  startYmd: string,
  endYmd: string,
): { dateFrom: string; dateTo: string } {
  const s = startOfDay(parse(startYmd, "yyyy-MM-dd", new Date()));
  const e = endOfDay(parse(endYmd, "yyyy-MM-dd", new Date()));
  return { dateFrom: s.toISOString(), dateTo: e.toISOString() };
}
