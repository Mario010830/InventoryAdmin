"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/dataTableExport";
import { cn } from "@/lib/utils";
import { exportRowsToPdf } from "@/lib/utils/export";
import { toast } from "sonner";

const CLIENT_PAGE = 50;

/** Modo servidor sin callback de CSV completo: export local = solo página actual. */
const DEFAULT_SERVER_EXPORT_NOTE =
  "CSV y PDF generados aquí solo incluyen las filas de esta página.";

/** Hay export CSV completo en servidor; PDF sigue local a la página visible. */
const DEFAULT_SERVER_CSV_ONLY_NOTE =
  "El CSV completo lo entrega el servidor (todos los pedidos del filtro). El PDF se genera en el navegador con esta página visible.";

/** Hay export PDF completo en servidor; CSV sigue local a la página visible. */
const DEFAULT_SERVER_PDF_ONLY_NOTE =
  "El PDF completo lo entrega el servidor (todos los pedidos del filtro). El CSV se genera con las filas de esta página visible.";

/** Ambos formatos vienen completos desde endpoints de export en servidor. */
const DEFAULT_SERVER_BOTH_NOTE =
  "CSV y PDF usan export completo en servidor (mismos filtros, sin paginación).";

function getNested(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((acc: unknown, k) => {
    if (acc != null && typeof acc === "object" && k in (acc as object)) {
      return (acc as Record<string, unknown>)[k];
    }
    return undefined;
  }, obj);
}

function rowToSearchHaystack(row: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const v of Object.values(row)) {
    if (v == null) continue;
    if (typeof v === "object") {
      try {
        parts.push(JSON.stringify(v));
      } catch {
        /* ignore */
      }
    } else {
      parts.push(String(v));
    }
  }
  return parts.join(" ").toLowerCase();
}

function cellExportText(row: Record<string, unknown>, key: string): string {
  const v = getNested(row, key);
  if (v == null) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export interface ReportTableColumn {
  key: string;
  label: string;
  render?: (row: Record<string, unknown>) => ReactNode;
}

export type ReportServerPagination = {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
};

export function ReportTable({
  columns,
  data,
  loading = false,
  searchable = true,
  onExportPDF,
  fileName = "reporte",
  /** Si se define, la tabla no asume que `data` es el universo completo: sin scroll infinito simulado; paginación explícita. */
  serverPagination,
  /** Texto bajo los botones de export cuando hay paginación en servidor (por defecto avisa del alcance). */
  exportNote,
  /**
   * Si se define, el botón «Exportar CSV» no usa las filas en memoria: p. ej.
   * `() => downloadSalesOrdersCsvExport(filters)` para GET /api/reports/sales/export.
   */
  onExportCsv,
}: {
  columns: ReportTableColumn[];
  data: Record<string, unknown>[];
  loading?: boolean;
  searchable?: boolean;
  onExportPDF?: () => void | Promise<void>;
  fileName?: string;
  serverPagination?: ReportServerPagination;
  exportNote?: string;
  onExportCsv?: () => void | Promise<void>;
}) {
  const isServer = serverPagination != null;

  const [search, setSearch] = useState("");
  const [csvBusy, setCsvBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [visibleCount, setVisibleCount] = useState(CLIENT_PAGE);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((row) => rowToSearchHaystack(row).includes(q));
  }, [data, search]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reiniciar paginación virtual solo en modo cliente
  useEffect(() => {
    if (isServer) return;
    setVisibleCount(CLIENT_PAGE);
  }, [search, filtered.length, isServer]);

  const slice = useMemo(() => {
    if (isServer) return filtered;
    return filtered.slice(0, visibleCount);
  }, [filtered, visibleCount, isServer]);

  const onScroll = useCallback(() => {
    if (isServer) return;
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, clientHeight, scrollHeight } = el;
    if (scrollTop + clientHeight >= scrollHeight - 24) {
      setVisibleCount((c) => Math.min(c + CLIENT_PAGE, filtered.length));
    }
  }, [filtered.length, isServer]);

  const stamp = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const exportRows = filtered as Record<string, unknown>[];

  const handleExportCsv = useCallback(async () => {
    if (onExportCsv) {
      setCsvBusy(true);
      try {
        await onExportCsv();
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Error al exportar CSV",
        );
      } finally {
        setCsvBusy(false);
      }
      return;
    }
    const headers = columns.map((c) => c.label);
    const lines = exportRows.map((row) =>
      columns.map((c) => {
        if (c.render) {
          const v = getNested(row, c.key);
          return v != null && typeof v !== "object" ? String(v) : "";
        }
        return cellExportText(row, c.key);
      }),
    );
    downloadCsv(`${fileName}_${stamp}.csv`, headers, lines);
  }, [columns, exportRows, fileName, onExportCsv, stamp]);

  const handleExportPdf = useCallback(async () => {
    if (onExportPDF) {
      setPdfBusy(true);
      try {
        await onExportPDF();
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Error al exportar PDF",
        );
      } finally {
        setPdfBusy(false);
      }
      return;
    }
    exportRowsToPdf({
      columns: columns.map((c) => ({ key: c.key, label: c.label })),
      rows: exportRows,
      getCellText: (row, key) => cellExportText(row, key),
      fileName: `${fileName}-${stamp}.pdf`,
      title: fileName,
    });
  }, [columns, exportRows, fileName, onExportPDF, stamp]);

  const totalPages = serverPagination
    ? Math.max(1, Math.ceil(serverPagination.totalCount / serverPagination.pageSize))
    : 1;

  const resolvedExportNote = isServer
    ? (exportNote ??
      (onExportCsv && onExportPDF
        ? DEFAULT_SERVER_BOTH_NOTE
        : onExportCsv
          ? DEFAULT_SERVER_CSV_ONLY_NOTE
          : onExportPDF
            ? DEFAULT_SERVER_PDF_ONLY_NOTE
            : DEFAULT_SERVER_EXPORT_NOTE))
    : undefined;

  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border border-[#eceff4] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <div className="border-b border-[#eef2f6] px-4 py-3">
          <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="divide-y divide-[#f1f5f9]">
          {Array.from({ length: 8 }, (_, i) => `report-skel-${i}`).map(
            (rowKey) => (
              <div key={rowKey} className="flex gap-4 px-4 py-3">
                {columns.map((c) => (
                  <div
                    key={c.key}
                    className="h-4 flex-1 animate-pulse rounded bg-slate-100"
                  />
                ))}
              </div>
            ),
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#eceff4] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef2f6] px-4 py-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {searchable ? (
            <input
              type="search"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 min-w-[200px] w-full max-w-md rounded-md border border-[#e2e8f0] bg-white px-3 text-[0.8125rem] text-[#0f172a] placeholder:text-[#94a3b8] focus-visible:border-[#4f6ef7] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[rgba(79,110,247,0.35)]"
              aria-label="Buscar en la tabla"
            />
          ) : (
            <span />
          )}
          {isServer && searchable ? (
            <span className="text-[0.7rem] text-slate-500">
              La búsqueda solo aplica a las filas de esta página.
            </span>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={csvBusy}
              onClick={() => void handleExportCsv()}
            >
              {csvBusy ? "Exportando…" : "Exportar CSV"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pdfBusy}
              onClick={() => void handleExportPdf()}
            >
              {pdfBusy ? "Exportando…" : "Exportar PDF"}
            </Button>
          </div>
          {resolvedExportNote ? (
            <p className="max-w-md text-right text-[0.7rem] leading-snug text-amber-800">
              {resolvedExportNote}
            </p>
          ) : null}
        </div>
      </div>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className={cn(
          "overflow-auto",
          !isServer && "max-h-[min(520px,70vh)]",
        )}
      >
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-[1] bg-[#f8fafc] text-[0.7rem] font-bold uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="border-b border-[#eef2f6] px-4 py-3">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-slate-500"
                >
                  Sin datos para el período seleccionado
                </td>
              </tr>
            ) : (
              slice.map((row, idx) => (
                <tr
                  key={
                    (typeof row.id === "string" || typeof row.id === "number"
                      ? String(row.id)
                      : null) ?? `row-${idx}`
                  }
                  className={cn(
                    "border-b border-[#f1f5f9]",
                    idx % 2 === 0 ? "bg-white" : "bg-slate-50/50",
                  )}
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className="max-w-[320px] px-4 py-2.5 text-slate-800"
                    >
                      <div className="truncate">
                        {c.render
                          ? c.render(row)
                          : String(getNested(row, c.key) ?? "—")}
                      </div>
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {isServer && serverPagination ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eef2f6] px-4 py-3 text-sm text-slate-600">
          <span>
            Página {serverPagination.page} de {totalPages} —{" "}
            {serverPagination.totalCount} registro
            {serverPagination.totalCount === 1 ? "" : "s"} (total filtrado)
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {serverPagination.onPageSizeChange ? (
              <label className="flex items-center gap-2 text-[0.8125rem]">
                Por página
                <select
                  className="rounded-md border border-[#e2e8f0] bg-white px-2 py-1 text-[0.8125rem]"
                  value={serverPagination.pageSize}
                  onChange={(e) =>
                    serverPagination.onPageSizeChange?.(Number(e.target.value))
                  }
                  aria-label="Tamaño de página"
                >
                  {[25, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={serverPagination.page <= 1}
              onClick={() =>
                serverPagination.onPageChange(serverPagination.page - 1)
              }
            >
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={serverPagination.page >= totalPages}
              onClick={() =>
                serverPagination.onPageChange(serverPagination.page + 1)
              }
            >
              Siguiente
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
