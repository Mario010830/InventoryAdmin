import type { ApexOptions } from "apexcharts";

/** Typography aligned with `src/components/charts/*` (Outfit + Inter fallback). */
export const apexChartFontFamily = "'Outfit', 'Inter', system-ui, sans-serif";

export const apexNoDataEs: ApexOptions["noData"] = {
  text: "Sin datos",
  align: "center",
  verticalAlign: "middle",
  style: {
    color: "#64748b",
    fontSize: "13px",
  },
};

export const apexChartLocaleEs: Partial<ApexOptions["chart"]> = {
  defaultLocale: "es",
  locales: [
    {
      name: "es",
      options: {
        toolbar: {
          download: "Descargar SVG",
          selection: "Seleccionar",
          selectionZoom: "Zoom por selección",
          zoomIn: "Acercar",
          zoomOut: "Alejar",
          pan: "Mover",
          reset: "Restablecer zoom",
        },
      },
    },
  ],
};

export function formatChartNumber(value: number): string {
  return new Intl.NumberFormat("es").format(value);
}
