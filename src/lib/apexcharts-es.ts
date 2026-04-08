import esLocale from "apexcharts/dist/locales/es.json";

/** Locale ApexCharts (meses en toolbars, exportación, etc.) */
export const apexChartLocaleEs = {
  defaultLocale: "es" as const,
  locales: [esLocale],
};

export const apexNoDataEs = {
  text: "Sin datos para mostrar",
  align: "center" as const,
};

/** Formato numérico tipo español (miles con punto) */
export function formatChartNumber(val: number | string): string {
  const n = typeof val === "string" ? Number(val) : val;
  if (!Number.isFinite(n)) return String(val);
  return Math.round(n).toLocaleString("es-ES");
}
