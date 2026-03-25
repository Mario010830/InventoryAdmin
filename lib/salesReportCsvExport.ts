import { getApiUrl, getToken } from "@/lib/auth-api";
import type { ReportFilters } from "@/lib/types/reports";

function buildSalesExportQuery(filters: ReportFilters): string {
  const qs = new URLSearchParams();
  qs.set("dateFrom", filters.dateFrom);
  qs.set("dateTo", filters.dateTo);
  if (filters.locationId != null)
    qs.set("locationId", String(filters.locationId));
  return qs.toString();
}

function timestampForFilename(): string {
  const d = new Date();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${y}${mo}${day}-${h}${mi}${s}`;
}

/** Nombre sugerido si el servidor no envía Content-Disposition. */
function defaultSalesCsvFilename(): string {
  return `reporte-ventas-pedidos-${timestampForFilename()}.csv`;
}

/** Nombre sugerido si el servidor no envía Content-Disposition. */
function defaultSalesPdfFilename(): string {
  return `reporte-ventas-pedidos-${timestampForFilename()}.pdf`;
}

async function downloadFromEndpoint(options: {
  path: string;
  filters: ReportFilters;
  fallbackFilename: string;
  errorLabel: string;
}): Promise<void> {
  const base = getApiUrl().replace(/\/$/, "");
  const url = `${base}${options.path}?${buildSalesExportQuery(options.filters)}`;
  const token = getToken();
  const headers: HeadersInit = {
    "ngrok-skip-browser-warning": "true",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      text.trim() || `Error al exportar ${options.errorLabel} (${res.status})`,
    );
  }

  const blob = await res.blob();
  const fromHeader = filenameFromContentDisposition(
    res.headers.get("Content-Disposition"),
  );
  const filename = fromHeader ?? options.fallbackFilename;

  const objectUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Parsea filename desde Content-Disposition (attachment; filename="..." o filename*=UTF-8''...). */
function filenameFromContentDisposition(header: string | null): string | null {
  if (!header?.trim()) return null;
  const utf8 = /filename\*=UTF-8''([^;\s]+)/i.exec(header);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1].trim());
    } catch {
      return utf8[1].trim();
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(header);
  if (quoted?.[1]) return quoted[1].trim();
  const unquoted = /filename=([^;\s]+)/i.exec(header);
  if (unquoted?.[1]) return unquoted[1].replace(/^"|"$/g, "").trim();
  return null;
}

/**
 * Descarga CSV completo de pedidos confirmados (mismos filtros que el reporte, sin paginación).
 * GET /api/reports/sales/export — respuesta text/csv, no JSON.
 */
export async function downloadSalesOrdersCsvExport(
  filters: ReportFilters,
): Promise<void> {
  await downloadFromEndpoint({
    path: "/reports/sales/export",
    filters,
    fallbackFilename: defaultSalesCsvFilename(),
    errorLabel: "CSV",
  });
}

/**
 * Descarga PDF completo de pedidos confirmados (mismos filtros que el reporte, sin paginación).
 * GET /api/reports/sales/export/pdf — respuesta application/pdf, no JSON.
 */
export async function downloadSalesOrdersPdfExport(
  filters: ReportFilters,
): Promise<void> {
  await downloadFromEndpoint({
    path: "/reports/sales/export/pdf",
    filters,
    fallbackFilename: defaultSalesPdfFilename(),
    errorLabel: "PDF",
  });
}
