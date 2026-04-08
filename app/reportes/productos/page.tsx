"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { Layers3, Package2, ShoppingBag, Tag } from "lucide-react";
import { useDisplayCurrency } from "@/contexts/DisplayCurrencyContext";
import { ReportFilters } from "@/components/reportes/ReportFilters";
import { ReportKpiCard } from "@/components/reportes/ReportKpiCard";
import { ReportPageLayout } from "@/components/reportes/ReportPageLayout";
import { ReportTable } from "@/components/reportes/ReportTable";
import { useReportData } from "@/components/reportes/useReportData";
import type { ProductsReportResponse, ReportFilters as ReportFilterParams } from "@/lib/types/reports";
import { apexChartLocaleEs, apexNoDataEs, formatChartNumber } from "@/lib/apexcharts-es";

const PIE_COLORS = ["#2563eb", "#7c3aed", "#16a34a", "#f59e0b", "#dc2626", "#0ea5e9", "#8b5cf6", "#22c55e"];
const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

function truncateLabel(s: string | null | undefined, max = 12): string {
  const v = (s ?? "Sin nombre").trim() || "Sin nombre";
  return v.length > max ? `${v.slice(0, max)}…` : v;
}

export default function ReportesProductosPage() {
  const { formatCup } = useDisplayCurrency();
  const [filters, setFilters] = useState<ReportFilterParams | null>(null);
  const [activeTab, setActiveTab] = useState<"top" | "cats">("top");

  const { data, loading, error } = useReportData<ProductsReportResponse>(
    "/reports/products",
    filters ?? { dateFrom: "", dateTo: "" },
  );

  const topByRevenue = useMemo(
    () =>
      [...(data?.topSellingProducts ?? [])]
        .sort((a, b) => b.revenue - a.revenue)
        .map((p) => ({
          ...p,
          productNameShort: truncateLabel(p.productName, 12),
        })),
    [data?.topSellingProducts],
  );

  const categoryRows = useMemo(
    () =>
      [...(data?.categoryDistribution ?? [])].sort(
        (a, b) => b.productsCount - a.productsCount,
      ),
    [data?.categoryDistribution],
  );

  const inactive = Math.max(0, (data?.totalProducts ?? 0) - (data?.activeProducts ?? 0));

  const topRevenueOptions: ApexOptions = useMemo(
    () => ({
      noData: apexNoDataEs,
      chart: { type: "bar", height: 320, toolbar: { show: false }, ...apexChartLocaleEs },
      plotOptions: { bar: { borderRadius: 6, borderRadiusApplication: "end", columnWidth: "48%" } },
      dataLabels: { enabled: false },
      xaxis: { categories: topByRevenue.slice(0, 10).map((r) => r.productNameShort) },
      yaxis: { labels: { formatter: (v) => formatChartNumber(Number(v)) } },
      tooltip: {
        y: { formatter: (v) => formatCup(Number(v)) },
      },
      colors: ["#2563eb"],
      grid: { borderColor: "#e2e8f0", strokeDashArray: 3 },
    }),
    [topByRevenue, formatCup],
  );
  const topRevenueSeries = useMemo(
    () => [{ name: "Revenue", data: topByRevenue.slice(0, 10).map((r) => r.revenue) }],
    [topByRevenue],
  );
  const categoryPieOptions: ApexOptions = useMemo(
    () => ({
      noData: apexNoDataEs,
      labels: categoryRows.map((r) => r.categoryName ?? "Sin categoría"),
      colors: categoryRows.map((_, idx) => PIE_COLORS[idx % PIE_COLORS.length]),
      chart: { type: "donut", ...apexChartLocaleEs },
      legend: { show: false },
      dataLabels: { enabled: false },
      plotOptions: { pie: { donut: { size: "56%" } } },
      tooltip: { y: { formatter: (v) => formatChartNumber(Number(v)) } },
      stroke: { colors: ["#fff"], width: 2 },
    }),
    [categoryRows],
  );

  return (
    <ReportPageLayout
      title="Reporte de productos"
      description="Comportamiento comercial del catálogo y distribución por categorías."
      controls={<ReportFilters onFilterChange={setFilters} />}
    >
      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ReportKpiCard
          label="Total productos"
          value={loading ? "—" : String(data?.totalProducts ?? 0)}
          loading={loading}
          icon={<Package2 />}
        />
        <ReportKpiCard
          label="Activos para venta"
          value={loading ? "—" : String(data?.activeProducts ?? 0)}
          subvalue="catálogo actual"
          loading={loading}
          icon={<ShoppingBag />}
        />
        <ReportKpiCard
          label="Inactivos"
          value={loading ? "—" : String(inactive)}
          subvalue={inactive > 0 ? "Revisar disponibilidad" : "Sin inactivos"}
          loading={loading}
          icon={<Layers3 className={inactive > 0 ? "text-amber-600" : ""} />}
        />
        <ReportKpiCard
          label="Categorías"
          value={loading ? "—" : String(data?.categoryDistribution.length ?? 0)}
          subvalue="con productos"
          loading={loading}
          icon={<Tag />}
        />
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-[#eceff4] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">
            Top 10 productos por revenue
          </h3>
          {topByRevenue.length === 0 ? (
            <p className="py-20 text-center text-sm text-slate-500">
              Sin ventas en el período
            </p>
          ) : (
            <div className="h-[320px]">
              <ReactApexChart options={topRevenueOptions} series={topRevenueSeries} type="bar" height={320} />
            </div>
          )}
        </section>

        <section className="rounded-xl border border-[#eceff4] bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">
            Distribución por categoría
          </h3>
          {categoryRows.length > 0 ? (
            <div className="grid h-[320px] grid-cols-[1fr_220px] gap-2">
              <ReactApexChart
                options={categoryPieOptions}
                series={categoryRows.map((r) => r.productsCount)}
                type="donut"
                height={320}
              />
              <div className="overflow-auto pr-1 text-sm">
                {categoryRows.map((row, idx) => (
                  <div key={`${row.categoryId ?? "null"}-${idx}`} className="mb-1 flex items-center justify-between gap-2">
                    <span className="truncate text-slate-700">
                      {row.categoryName ?? "Sin categoría"}
                    </span>
                    <span className="font-medium text-slate-900">{row.productsCount}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="py-20 text-center text-sm text-slate-500">
              Sin datos de categorías.
            </p>
          )}
        </section>
      </div>

      <div className="dashboard-report-filters__periods mb-4">
        <button
          type="button"
          onClick={() => setActiveTab("top")}
          className={`dashboard-report-filters__period ${activeTab === "top" ? "dashboard-report-filters__period--active" : ""}`}
        >
          Más vendidos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("cats")}
          className={`dashboard-report-filters__period ${activeTab === "cats" ? "dashboard-report-filters__period--active" : ""}`}
        >
          Distribución por categoría
        </button>
      </div>

      {activeTab === "top" ? (
        <>
          <ReportTable
            columns={[
              { key: "productCode", label: "Código" },
              { key: "productName", label: "Producto" },
              { key: "quantitySold", label: "Unidades vendidas" },
              {
                key: "revenue",
                label: "Revenue",
                render: (row) => formatCup(Number(row.revenue ?? 0)),
              },
            ]}
            data={(data?.topSellingProducts ?? []) as unknown as Record<string, unknown>[]}
            loading={loading}
            searchable
            fileName="top-productos"
          />
          <p className="mt-2 text-sm text-slate-500">
            Top 10 productos por revenue en el período seleccionado
          </p>
          {/* TODO: margen bruto requiere unitCost/unitPrice en el DTO */}
        </>
      ) : (
        <>
          <ReportTable
            columns={[
              { key: "categoryName", label: "Categoría" },
              { key: "productsCount", label: "Productos" },
            ]}
            data={categoryRows as unknown as Record<string, unknown>[]}
            loading={loading}
            searchable
            fileName="categorias-productos"
          />
          <p className="mt-2 text-sm text-slate-500">
            Total de productos por categoría (independiente del período)
          </p>
        </>
      )}
    </ReportPageLayout>
  );
}
