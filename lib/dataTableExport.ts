import { formatDisplayCurrency } from "@/lib/formatCurrency";

/** Formateo de moneda para export; si se pasa, convierte desde CUP como en la UI. */
export type FormatCupFn = (cup: number) => string;

function getNestedValue(row: object, key: string): unknown {
  return key.split(".").reduce((obj: unknown, k) => (obj as Record<string, unknown>)?.[k], row);
}

function resolveValue<T extends object>(
  row: T,
  key: string | ((row: T) => string | number),
): unknown {
  if (typeof key === "function") return key(row);
  return getNestedValue(row, key);
}

function formatDate(iso: string, locale = "es-ES") {
  try {
    return new Date(iso).toLocaleDateString(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function formatCurrency(
  n: number,
  locale = "es-ES",
  currency?: string,
  formatCup?: FormatCupFn,
) {
  if (formatCup && (currency == null || currency === "CUP")) {
    return formatCup(n);
  }
  if (currency != null && currency !== "CUP") {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  }
  return formatDisplayCurrency(n, locale);
}

export type ExportColumn<T> = {
  key: string | ((row: T) => string | number);
  label: string;
  type?: "text" | "number" | "currency" | "date" | "boolean" | "custom";
  locale?: string;
  currency?: string;
  booleanLabels?: { true: string; false: string };
  render?: (row: T) => unknown;
  exportValue?: (row: T) => string;
};

/** Texto plano para CSV/XLSX (sin JSX). */
export function cellTextForExport<T extends object>(
  col: ExportColumn<T>,
  row: T,
  formatCup?: FormatCupFn,
): string {
  if (col.exportValue) return col.exportValue(row);
  if (col.render) {
    const v = resolveValue(row, col.key);
    if (v != null && typeof v !== "object") return String(v);
    return "";
  }
  const val = resolveValue(row, col.key);
  switch (col.type) {
    case "boolean": {
      const labels = col.booleanLabels ?? { true: "Sí", false: "No" };
      return val ? labels.true : labels.false;
    }
    case "date":
      return formatDate(String(val ?? ""), col.locale);
    case "currency":
      return formatCurrency(Number(val ?? 0), col.locale, col.currency, formatCup);
    case "number":
      return val != null ? String(val) : "";
    default:
      return val != null ? String(val) : "";
  }
}

export function buildExportRows<T extends object>(
  rows: T[],
  columns: ExportColumn<T>[],
  formatCup?: FormatCupFn,
): { headers: string[]; lines: string[][] } {
  const headers = columns.map((c) => c.label);
  const lines = rows.map((row) => columns.map((c) => cellTextForExport(c, row, formatCup)));
  return { headers, lines };
}

export function downloadCsv(filename: string, headers: string[], lines: string[][]) {
  const esc = (s: string) => {
    const t = String(s ?? "");
    if (/[",\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
    return t;
  };
  const bom = "\uFEFF";
  const body = [headers.map(esc).join(","), ...lines.map((row) => row.map(esc).join(","))].join(
    "\r\n",
  );
  const blob = new Blob([bom + body], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function downloadXlsx(filename: string, headers: string[], lines: string[][]) {
  const XLSX = await import("xlsx");
  const wsData = [headers, ...lines];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Datos");
  XLSX.writeFile(wb, filename);
}

export function exportFilename(prefix: string, ext: "csv" | "xlsx") {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${prefix}_export_${y}-${m}-${day}.${ext}`;
}
