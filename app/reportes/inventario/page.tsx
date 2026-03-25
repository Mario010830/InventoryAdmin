"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Boxes, ClipboardList, PackageSearch } from "lucide-react";
import { useDisplayCurrency } from "@/contexts/DisplayCurrencyContext";
import { ReportFilters } from "@/components/reportes/ReportFilters";
import { ReportKpiCard } from "@/components/reportes/ReportKpiCard";
import { ReportPageLayout } from "@/components/reportes/ReportPageLayout";
import { ReportTable } from "@/components/reportes/ReportTable";
import { useReportData } from "@/components/reportes/useReportData";
import type { InventoryReportResponse, ReportFilters as ReportFilterParams } from "@/lib/types/reports";

const PIE_COLORS = ["#16a34a", "#dc2626", "#2563eb"];

function truncateName(s: string | null | undefined, max = 20): string {
  const safe = (s ?? "Sin nombre").trim() || "Sin nombre";
  return safe.length > max ? `${safe.slice(0, max)}…` : safe;
}

export default function ReportesInventarioPage() {
  const { formatCup } = useDisplayCurrency();
  const [filters, setFilters] = useState<ReportFilterParams | null>(null);
  const [activeTab, setActiveTab] = useState<"low" | "stock">("low");

  const { data, loading, error } = useReportData<InventoryReportResponse>(
    "/reports/inventory",
    filters ?? { dateFrom: "", dateTo: "" },
  );

  const chartTopStock = useMemo(
    () =>
      (data?.stockByProduct ?? []).slice(0, 10).map((p) => ({
        ...p,
        productNameShort: truncateName(p.productName, 20),
      })),
    [data?.stockByProduct],
  );

  const pieMovements = useMemo(() => {
    if (!data?.movementsSummary) return [];
    return [
      { name: "Entradas", value: data.movementsSummary.entries },
      { name: "Salidas", value: data.movementsSummary.exits },
      { name: "Ajustes", value: data.movementsSummary.adjustments },
    ].filter((x) => x.value > 0);
  }, [data?.movementsSummary]);

  const hasMovements = (data?.movementsSummary.totalMovements ?? 0) > 0;

  return (
    <ReportPageLayout
      title="Reporte de inventario"
      description="Estado actual de stock y resumen de movimientos por período."
    >
      <ReportFilters onFilterChange={setFilters} />

      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ReportKpiCard
          label="Stock total"
          value={loading ? "—" : String(data?.totalStock ?? 0)}
          subvalue="unidades actuales"
          loading={loading}
          icon={<Boxes />}
        />
        <ReportKpiCard
          label="Valor del inventario"
          value={loading ? "—" : formatCup(data?.inventoryValue ?? 0)}
          subvalue="stock actual"
          loading={loading}
          icon={<PackageSearch />}
        />
        <ReportKpiCard
          label="Productos bajo mínimo"
          value={loading ? "—" : String(data?.lowStockProducts.length ?? 0)}
          subvalue={
            (data?.lowStockProducts.length ?? 0) > 0 ? "Requiere atención" : "Sin alertas"
          }
          loading={loading}
          icon={<AlertTriangle className={(data?.lowStockProducts.length ?? 0) > 0 ? "text-red-600" : ""} />}
        />
        <ReportKpiCard
          label="Movimientos"
          value={loading ? "—" : String(data?.movementsSummary.totalMovements ?? 0)}
          subvalue={
            data
              ? `E: ${data.movementsSummary.entries} / S: ${data.movementsSummary.exits} / A: ${data.movementsSummary.adjustments}`
              : undefined
          }
          loading={loading}
          icon={<ClipboardList />}
        />
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-[#eceff4] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">
            Top productos por stock
          </h3>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartTopStock} layout="vertical" margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                <XAxis type="number" />
                <YAxis
                  type="category"
                  dataKey="productNameShort"
                  width={130}
                />
                <Tooltip
                  formatter={(value: number | string | undefined) => [
                    String(value ?? 0),
                    "Stock",
                  ]}
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as { productName?: string | null; productCode?: string | null } | undefined;
                    if (!row) return "";
                    const code = row.productCode ? `${row.productCode} · ` : "";
                    return `${code}${row.productName ?? "Sin nombre"}`;
                  }}
                />
                <Bar dataKey="totalStock" fill="#2563eb" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-xl border border-[#eceff4] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">
            Distribución de movimientos
          </h3>
          {hasMovements ? (
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieMovements}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={110}
                    label
                  >
                    {pieMovements.map((_, idx) => (
                      <Cell key={`mov-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
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
          onClick={() => setActiveTab("low")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${activeTab === "low" ? "bg-[#4f6ef7] text-white" : "bg-white text-slate-700 border border-slate-200"}`}
        >
          Productos bajo mínimo
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("stock")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${activeTab === "stock" ? "bg-[#4f6ef7] text-white" : "bg-white text-slate-700 border border-slate-200"}`}
        >
          Stock por producto
        </button>
      </div>

      {activeTab === "low" ? (
        <>
          <ReportTable
            columns={[
              { key: "productCode", label: "Código" },
              { key: "productName", label: "Producto" },
              {
                key: "totalStock",
                label: "Stock actual",
                render: (row) => (
                  <span className="font-medium text-red-600">{String(row.totalStock ?? 0)}</span>
                ),
              },
            ]}
            data={(data?.lowStockProducts ?? []) as unknown as Record<string, unknown>[]}
            loading={loading}
            searchable
            fileName="productos-bajo-minimo"
          />
          {(data?.lowStockProducts.length ?? 0) === 0 && !loading ? (
            <p className="mt-2 text-sm text-slate-500">
              No hay productos bajo el mínimo de stock
            </p>
          ) : null}
        </>
      ) : (
        <>
          <ReportTable
            columns={[
              { key: "productCode", label: "Código" },
              { key: "productName", label: "Producto" },
              { key: "totalStock", label: "Stock total" },
            ]}
            data={(data?.stockByProduct ?? []) as unknown as Record<string, unknown>[]}
            loading={loading}
            searchable
            fileName="stock-por-producto"
          />
          <p className="mt-2 text-sm text-slate-500">
            Mostrando los 50 productos con mayor stock
          </p>
        </>
      )}
    </ReportPageLayout>
  );
}
