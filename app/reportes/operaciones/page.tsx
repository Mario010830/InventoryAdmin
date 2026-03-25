"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownCircle, ArrowUpCircle, SlidersHorizontal, Waypoints } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getApiUrl, getToken } from "@/lib/auth-api";
import { parsePaginated } from "@/lib/api-utils";
import type { InventoryMovementResponse, SupplierResponse } from "@/lib/dashboard-types";
import { exportRowsToPdf } from "@/lib/utils/export";
import { useGetSuppliersQuery } from "@/app/dashboard/suppliers/_service/suppliersApi";
import { ReportFilters } from "@/components/reportes/ReportFilters";
import { ReportKpiCard } from "@/components/reportes/ReportKpiCard";
import { ReportPageLayout } from "@/components/reportes/ReportPageLayout";
import { ReportTable } from "@/components/reportes/ReportTable";
import { useReportData } from "@/components/reportes/useReportData";
import type {
  MovementsByTypeDto,
  OperationsReportResponse,
  ReportFilters as ReportFilterParams,
} from "@/lib/types/reports";

const TYPE_LABEL: Record<string, string> = {
  entry: "Entrada",
  exit: "Salida",
  adjustment: "Ajuste",
};
const TYPE_COLOR: Record<string, string> = {
  entry: "#16a34a",
  exit: "#dc2626",
  adjustment: "#2563eb",
};
const TYPE_TEXT_CLASS: Record<string, string> = {
  entry: "text-green-600",
  exit: "text-red-600",
  adjustment: "text-blue-600",
};
const REASON_LABEL: Record<string, string> = {
  Venta: "Venta",
  Correccion: "Corrección",
  DevolucionCliente: "Devolución cliente",
};

function toDateParam(iso: string): string {
  // inventory-movement usa from/to en APIs existentes del proyecto
  return iso;
}

function formatFecha(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ReportesOperacionesPage() {
  const [filters, setFilters] = useState<ReportFilterParams | null>(null);
  const [activeTab, setActiveTab] = useState<"detail" | "summary">("detail");
  const [detailRows, setDetailRows] = useState<InventoryMovementResponse[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const { data, loading, error } = useReportData<OperationsReportResponse>(
    "/reports/operations",
    filters ?? { dateFrom: "", dateTo: "" },
  );

  const { data: suppliersResult } = useGetSuppliersQuery({ page: 1, perPage: 500 });
  const suppliersById = useMemo(() => {
    const map = new Map<number, SupplierResponse>();
    for (const s of suppliersResult?.data ?? []) map.set(s.id, s);
    return map;
  }, [suppliersResult?.data]);

  useEffect(() => {
    if (!filters) return;
    let cancelled = false;
    const run = async () => {
      setDetailLoading(true);
      setDetailError(null);
      try {
        const params = new URLSearchParams();
        params.set("page", "1");
        params.set("perPage", "200");
        params.set("sortOrder", "desc");
        params.set("from", toDateParam(filters.dateFrom));
        params.set("to", toDateParam(filters.dateTo));
        if (filters.locationId != null) params.set("locationId", String(filters.locationId));

        const token = getToken();
        const headers: HeadersInit = { "ngrok-skip-browser-warning": "true" };
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(
          `${getApiUrl().replace(/\/$/, "")}/inventory-movement?${params.toString()}`,
          { headers },
        );
        const raw: unknown = await res.json().catch(() => null);
        if (!res.ok || !raw) {
          if (!cancelled) {
            setDetailRows([]);
            setDetailError(`Error ${res.status} al cargar movimientos`);
          }
          return;
        }
        const parsed = parsePaginated<InventoryMovementResponse>(raw, 200);
        if (!cancelled) setDetailRows(parsed.data);
      } catch (e) {
        if (!cancelled) {
          setDetailRows([]);
          setDetailError(e instanceof Error ? e.message : "Error al cargar movimientos");
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [filters]);

  const byType = useMemo(() => {
    const base = [
      { type: "entry", count: 0, quantitySum: 0 },
      { type: "exit", count: 0, quantitySum: 0 },
      { type: "adjustment", count: 0, quantitySum: 0 },
    ];
    const incoming = data?.movementsByType ?? [];
    for (const row of incoming) {
      const i = base.findIndex((b) => b.type === row.type);
      if (i >= 0) {
        base[i] = {
          type: row.type,
          count: row.count,
          quantitySum: row.quantitySum,
        };
      }
    }
    return base;
  }, [data?.movementsByType]);

  const pieRows = useMemo(
    () => byType.filter((x) => x.count > 0),
    [byType],
  );

  const summaryRows = useMemo(() => {
    const total = byType.reduce((acc, row) => acc + row.count, 0);
    return byType.map((row) => ({
      ...row,
      label: TYPE_LABEL[row.type] ?? row.type,
      percentage: total > 0 ? (row.count * 100) / total : 0,
    }));
  }, [byType]);

  const totals = useMemo(
    () => ({
      count: summaryRows.reduce((acc, row) => acc + row.count, 0),
      quantity: summaryRows.reduce((acc, row) => acc + row.quantitySum, 0),
    }),
    [summaryRows],
  );

  const exportSummaryPdf = () => {
    const rows = summaryRows.map((r) => ({
      tipo: r.label,
      movimientos: r.count,
      unidades: r.quantitySum,
      porcentaje: `${r.percentage.toFixed(1)}%`,
    }));
    rows.push({
      tipo: "TOTAL",
      movimientos: totals.count,
      unidades: totals.quantity,
      porcentaje: "100%",
    });
    exportRowsToPdf({
      columns: [
        { key: "tipo", label: "Tipo" },
        { key: "movimientos", label: "Movimientos" },
        { key: "unidades", label: "Unidades totales" },
        { key: "porcentaje", label: "% del total" },
      ],
      rows,
      getCellText: (row, key) => String(row[key] ?? ""),
      fileName: `resumen-operaciones-${new Date().toISOString().slice(0, 10)}.pdf`,
      title: "Resumen por tipo",
    });
  };

  return (
    <ReportPageLayout
      title="Reporte de operaciones"
      description="Análisis de entradas, salidas y ajustes con detalle de movimientos."
    >
      <ReportFilters onFilterChange={setFilters} />

      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ReportKpiCard
          label="Total movimientos"
          value={loading ? "—" : String(data?.totalMovements ?? 0)}
          loading={loading}
          icon={<Waypoints />}
        />
        <ReportKpiCard
          label="Entradas"
          value={loading ? "—" : String(data?.entries ?? 0)}
          loading={loading}
          icon={<ArrowUpCircle className="text-green-600" />}
        />
        <ReportKpiCard
          label="Salidas"
          value={loading ? "—" : String(data?.exits ?? 0)}
          loading={loading}
          icon={<ArrowDownCircle className="text-red-600" />}
        />
        <ReportKpiCard
          label="Ajustes"
          value={loading ? "—" : String(data?.adjustments ?? 0)}
          loading={loading}
          icon={<SlidersHorizontal className="text-blue-600" />}
        />
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-[#eceff4] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Movimientos por tipo</h3>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byType} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                <XAxis dataKey="type" tickFormatter={(v) => TYPE_LABEL[v] ?? v} />
                <YAxis />
                <Tooltip
                  labelFormatter={(label) => TYPE_LABEL[String(label)] ?? String(label)}
                  formatter={(value: number | string | undefined, key: string | undefined) => [
                    String(value ?? 0),
                    key === "count" ? "Movimientos" : "Unidades",
                  ]}
                />
                <Legend />
                <Bar dataKey="count" name="Movimientos" fill="#64748b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="quantitySum" name="Unidades" fill="#334155" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border border-[#eceff4] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Proporción de movimientos</h3>
          {(data?.totalMovements ?? 0) > 0 ? (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieRows} dataKey="count" nameKey="type" outerRadius={110} label>
                    {pieRows.map((row) => (
                      <Cell key={row.type} fill={TYPE_COLOR[row.type] ?? "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip
                    labelFormatter={(label) => TYPE_LABEL[String(label)] ?? String(label)}
                    formatter={(v: number | string | undefined) => [
                      String(v ?? 0),
                      "Movimientos",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-20 text-center text-sm text-slate-500">
              Sin movimientos en el período seleccionado.
            </p>
          )}
        </section>
      </div>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("detail")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${activeTab === "detail" ? "bg-[#4f6ef7] text-white" : "bg-white text-slate-700 border border-slate-200"}`}
        >
          Detalle de movimientos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("summary")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${activeTab === "summary" ? "bg-[#4f6ef7] text-white" : "bg-white text-slate-700 border border-slate-200"}`}
        >
          Resumen por tipo
        </button>
      </div>

      {activeTab === "detail" ? (
        <>
          {detailError ? (
            <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
              {detailError}
            </p>
          ) : null}
          <ReportTable
            columns={[
              {
                key: "createdAt",
                label: "Fecha",
                render: (row) => formatFecha(String(row.createdAt ?? "")),
              },
              { key: "productName", label: "Producto" },
              {
                key: "type",
                label: "Tipo",
                render: (row) => {
                  const raw = String(row.type ?? "");
                  return (
                    <span className={TYPE_TEXT_CLASS[raw] ?? ""}>
                      {TYPE_LABEL[raw] ?? raw}
                    </span>
                  );
                },
              },
              { key: "quantity", label: "Cantidad" },
              {
                key: "reason",
                label: "Razón",
                render: (row) => {
                  const raw = String(row.reason ?? "");
                  return REASON_LABEL[raw] ?? (raw || "—");
                },
              },
              { key: "referenceDocument", label: "Documento ref." },
              {
                key: "supplierName",
                label: "Proveedor",
                render: (row) => {
                  const id = Number(row.supplierId ?? 0);
                  if (!Number.isFinite(id) || id <= 0) return "—";
                  return suppliersById.get(id)?.name ?? `#${id}`;
                },
              },
            ]}
            data={detailRows as unknown as Record<string, unknown>[]}
            loading={detailLoading}
            fileName="movimientos-inventario"
            searchable
          />
        </>
      ) : (
        <section className="rounded-xl border border-[#eceff4] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-800">Resumen por tipo</h3>
            <Button type="button" variant="outline" size="sm" onClick={exportSummaryPdf}>
              Exportar PDF
            </Button>
          </div>
          <div className="overflow-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-600">
                  <th className="border-b border-slate-200 px-3 py-2">Tipo</th>
                  <th className="border-b border-slate-200 px-3 py-2">Movimientos</th>
                  <th className="border-b border-slate-200 px-3 py-2">Unidades totales</th>
                  <th className="border-b border-slate-200 px-3 py-2">% del total</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((row) => (
                  <tr key={row.type} className="border-b border-slate-100">
                    <td className="px-3 py-2">{row.label}</td>
                    <td className="px-3 py-2">{row.count}</td>
                    <td className="px-3 py-2">{row.quantitySum}</td>
                    <td className="px-3 py-2">{row.percentage.toFixed(1)}%</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold text-slate-800">
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2">{totals.count}</td>
                  <td className="px-3 py-2">{totals.quantity}</td>
                  <td className="px-3 py-2">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}
    </ReportPageLayout>
  );
}
