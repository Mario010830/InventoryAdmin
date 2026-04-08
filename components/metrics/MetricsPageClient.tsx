"use client";

import { Package, ShoppingCart, Star, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { BarChartCard, StatCard, theme } from "@/components/dashboard";
import { ReportKpiCard } from "@/components/reportes/ReportKpiCard";
import { useDisplayCurrency } from "@/contexts/DisplayCurrencyContext";
import { fetchAllMetrics, type MetricsBundle } from "@/lib/metrics-fetch";
import type {
  CustomersMetricsNormalized,
  MetricsPeriod,
  MetricsSection,
  ProductsMetricsNormalized,
  SalesFunnelStep,
  SalesMetricsNormalized,
  TrafficMetricsNormalized,
} from "@/lib/types/metrics";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store/store";
import { MetricsEmptyState } from "./MetricsEmptyState";
import { apexChartLocaleEs, apexNoDataEs, formatChartNumber } from "@/lib/apexcharts-es";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

const PERIODS: MetricsPeriod[] = ["7d", "30d", "90d"];

const TABS: { id: MetricsSection; label: string }[] = [
  { id: "traffic", label: "Tráfico" },
  { id: "products", label: "Productos" },
  { id: "sales", label: "Ventas" },
  { id: "customers", label: "Clientes" },
];

function formatDurationSeconds(sec: number | null): string {
  if (sec == null || sec <= 0) return "—";
  if (sec < 60) return `${Math.round(sec)} s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m < 60) return `${m} min ${s} s`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h} h ${rm} min`;
}

function changeTrend(
  pct: number | null,
  options?: { goodWhenDown?: boolean },
): { text: string; trendUp: boolean } | undefined {
  if (pct == null || Number.isNaN(pct)) return undefined;
  const sign = pct > 0 ? "+" : "";
  const text = `${sign}${pct.toFixed(1)}% vs. período anterior`;
  const rawUp = pct > 0;
  const trendUp = options?.goodWhenDown ? !rawUp : rawUp;
  return { text, trendUp };
}

function KpiSkeletonRow() {
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {(["a", "b", "c", "d"] as const).map((id) => (
        <ReportKpiCard key={id} label="—" value="—" loading />
      ))}
    </div>
  );
}

function ConversionFunnel({ steps }: { steps: SalesFunnelStep[] }) {
  const max = Math.max(1, ...steps.map((s) => s.count));
  return (
    <div className="rounded-xl border border-[#eceff4] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
      <h3 className="text-base font-semibold text-slate-900">
        Embudo de conversión
      </h3>
      <p className="mt-0.5 text-sm text-slate-500">
        De visitas a pedidos completados: la caída indica la proporción perdida
        respecto al paso anterior.
      </p>
      <div className="mt-6 space-y-4">
        {steps.map((s, i) => (
          <div key={s.key}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <span className="font-medium text-slate-800">{s.label}</span>
              <span className="tabular-nums text-slate-600">
                {s.count.toLocaleString()}
                {i > 0 &&
                s.dropFromPreviousPct != null &&
                Number.isFinite(s.dropFromPreviousPct) ? (
                  <span className="ml-2 text-slate-400">
                    ({s.dropFromPreviousPct.toFixed(1)}% de caída)
                  </span>
                ) : null}
              </span>
            </div>
            <div className="mt-2 h-10 overflow-hidden rounded-lg bg-slate-100">
              <div
                className="h-full rounded-lg bg-indigo-500 transition-[width] duration-500"
                style={{ width: `${(s.count / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RankedSearchList({
  items,
  empty,
}: {
  items: { term: string; visits: number }[];
  empty: boolean;
}) {
  if (empty) {
    return (
      <MetricsEmptyState
        title="Sin datos de búsqueda"
        description="Cuando los clientes busquen en tu catálogo, los términos más frecuentes aparecerán aquí."
      />
    );
  }
  return (
    <ol className="divide-y divide-[#eceff4]">
      {items.map((row, i) => (
        <li
          key={`${row.term}-${i}`}
          className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
              {i + 1}
            </span>
            <span className="truncate font-medium text-slate-800">
              {row.term}
            </span>
          </span>
          <span className="shrink-0 tabular-nums text-sm text-slate-500">
            {row.visits.toLocaleString()} visitas
          </span>
        </li>
      ))}
    </ol>
  );
}

function RankedBarRows({
  rows,
  formatValue,
  emptyTitle,
  emptyDescription,
}: {
  rows: { name: string; value: number }[];
  formatValue: (n: number) => string;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) {
    return (
      <MetricsEmptyState title={emptyTitle} description={emptyDescription} />
    );
  }
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.name}>
          <div className="mb-1 flex justify-between gap-2 text-sm">
            <span className="min-w-0 truncate font-medium text-slate-800">
              {r.name}
            </span>
            <span className="shrink-0 tabular-nums text-slate-600">
              {formatValue(r.value)}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-500"
              style={{ width: `${(r.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function isTrafficEmpty(d: TrafficMetricsNormalized | null): boolean {
  if (!d) return true;
  return (
    d.catalogVisits === 0 &&
    d.uniqueVisitors === 0 &&
    d.sources.length === 0 &&
    d.topSearches.length === 0
  );
}

function isProductsEmpty(d: ProductsMetricsNormalized | null): boolean {
  if (!d) return true;
  return (
    d.totalViews === 0 &&
    d.mostViewed.length === 0 &&
    d.viewToCartRate.length === 0 &&
    d.activeProducts === 0
  );
}

function isSalesEmpty(d: SalesMetricsNormalized | null): boolean {
  if (!d) return true;
  const funnelDead =
    d.funnel.length === 0 || d.funnel.every((s) => s.count === 0);
  return d.revenue === 0 && d.orders === 0 && funnelDead;
}

function isCustomersEmpty(d: CustomersMetricsNormalized | null): boolean {
  if (!d) return true;
  const totalBuyers = d.buyersNew + d.buyersReturning;
  const kpiTotal = d.newBuyers + d.returningBuyers;
  return (
    totalBuyers === 0 &&
    kpiTotal === 0 &&
    d.reviewsReceived === 0 &&
    (d.avgRating == null || d.avgRating === 0) &&
    d.ratingsDistribution.length === 0
  );
}

export function MetricsPageClient() {
  const user = useAppSelector((s) => s.auth);
  const { formatCup } = useDisplayCurrency();
  const businessId =
    user?.organizationId ?? user?.location?.organizationId ?? null;

  const [period, setPeriod] = useState<MetricsPeriod>("30d");
  const [tab, setTab] = useState<MetricsSection>("traffic");
  const [loading, setLoading] = useState(true);
  const [bundle, setBundle] = useState<MetricsBundle | null>(null);

  const load = useCallback(async () => {
    if (businessId == null || businessId <= 0) {
      setBundle(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const b = await fetchAllMetrics(businessId, period);
    setBundle(b);
    setLoading(false);
  }, [businessId, period]);

  useEffect(() => {
    void load();
  }, [load]);

  const sectionError = bundle?.errors[tab];

  const traffic = bundle?.traffic ?? null;
  const products = bundle?.products ?? null;
  const sales = bundle?.sales ?? null;
  const customers = bundle?.customers ?? null;

  const trafficSourcesChart = useMemo(() => {
    if (!traffic?.sources.length) {
      return [
        { label: "Búsqueda en marketplace", value: 0 },
        { label: "Directo", value: 0 },
        { label: "Redes sociales", value: 0 },
        { label: "Externo", value: 0 },
      ];
    }
    return traffic.sources.map((s) => ({ label: s.label, value: s.value }));
  }, [traffic]);

  const ratingsBars = useMemo(() => {
    const map = new Map<number, number>();
    for (let s = 1; s <= 5; s++) map.set(s, 0);
    for (const row of customers?.ratingsDistribution ?? []) {
      if (row.stars >= 1 && row.stars <= 5) {
        map.set(row.stars, row.count);
      }
    }
    return [5, 4, 3, 2, 1].map((stars) => ({
      label: `${stars}★`,
      value: map.get(stars) ?? 0,
    }));
  }, [customers]);

  const donutBuyers = useMemo(() => {
    const n = customers?.buyersNew ?? customers?.newBuyers ?? 0;
    const r = customers?.buyersReturning ?? customers?.returningBuyers ?? 0;
    return [
      { name: "Compradores nuevos", value: n },
      { name: "Compradores recurrentes", value: r },
    ];
  }, [customers]);

  const donutBuyersOptions: ApexOptions = useMemo(
    () => ({
      noData: apexNoDataEs,
      labels: donutBuyers.map((d) => d.name),
      colors: donutBuyers.map((_, i) => theme.chart[i % theme.chart.length]),
      chart: { type: "donut", ...apexChartLocaleEs },
      legend: { show: false },
      dataLabels: { enabled: false },
      plotOptions: { pie: { donut: { size: "56%" } } },
      stroke: { colors: [theme.surface], width: 2 },
      tooltip: { y: { formatter: (v) => formatChartNumber(Number(v)) } },
    }),
    [donutBuyers],
  );

  const ratingsOptions: ApexOptions = useMemo(
    () => ({
      noData: apexNoDataEs,
      chart: { type: "bar", height: 280, toolbar: { show: false }, ...apexChartLocaleEs },
      plotOptions: { bar: { borderRadius: 4, borderRadiusApplication: "end", columnWidth: "48%" } },
      dataLabels: { enabled: false },
      xaxis: {
        categories: ratingsBars.map((r) => r.label),
        labels: { style: { colors: theme.secondaryText, fontSize: "11px" } },
      },
      yaxis: {
        labels: {
          formatter: (v) => formatChartNumber(Number(v)),
          style: { colors: [theme.secondaryText], fontSize: "11px" },
        },
      },
      tooltip: { y: { formatter: (v) => formatChartNumber(Number(v)) } },
      colors: [theme.accent],
      grid: { borderColor: theme.divider, strokeDashArray: 3 },
    }),
    [ratingsBars],
  );

  if (!user) {
    return null;
  }

  if (businessId == null || businessId <= 0) {
    return (
      <div className="w-full min-w-0">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Métricas
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Analíticas de tu catálogo
          </p>
        </header>
        <MetricsEmptyState
          title="Sin contexto de negocio"
          description="Tu usuario no está vinculado a una organización. Las métricas estarán disponibles cuando tu cuenta esté asociada a un negocio."
        />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Métricas
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Analíticas de tu catálogo
          </p>
        </header>
        <fieldset className="m-0 shrink-0 rounded-full border border-[#eceff4] bg-slate-50/80 p-1">
          <legend className="sr-only">Período</legend>
          <div className="flex flex-wrap gap-2">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium transition",
                  period === p
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-white",
                )}
              >
                {p === "7d" ? "7 días" : p === "30d" ? "30 días" : "90 días"}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div
        className="mb-6 flex flex-wrap gap-2"
        role="tablist"
        aria-label="Secciones de métricas"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-medium transition",
              tab === t.id
                ? "border-indigo-600 bg-indigo-50 text-indigo-800"
                : "border-[#eceff4] bg-white text-slate-600 hover:border-slate-300",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {sectionError ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {sectionError}
        </p>
      ) : null}

      {tab === "traffic" ? (
        <>
          {loading ? (
            <KpiSkeletonRow />
          ) : (
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Visitas al catálogo"
                value={traffic?.catalogVisits.toLocaleString() ?? "0"}
                icon="visibility"
                trend={
                  changeTrend(traffic?.catalogVisitsChangePct ?? null)?.text
                }
                trendUp={
                  changeTrend(traffic?.catalogVisitsChangePct ?? null)
                    ?.trendUp ?? true
                }
              />
              <StatCard
                label="Visitantes únicos"
                value={traffic?.uniqueVisitors.toLocaleString() ?? "0"}
                icon="people"
                trend={
                  changeTrend(traffic?.uniqueVisitorsChangePct ?? null)?.text
                }
                trendUp={
                  changeTrend(traffic?.uniqueVisitorsChangePct ?? null)
                    ?.trendUp ?? true
                }
              />
              <StatCard
                label="Tasa de rebote"
                value={
                  traffic?.bounceRatePct != null
                    ? `${traffic.bounceRatePct.toFixed(1)}%`
                    : "—"
                }
                icon="exit_to_app"
                trend={
                  changeTrend(traffic?.bounceRateChangePct ?? null, {
                    goodWhenDown: true,
                  })?.text
                }
                trendUp={
                  changeTrend(traffic?.bounceRateChangePct ?? null, {
                    goodWhenDown: true,
                  })?.trendUp ?? true
                }
              />
              <StatCard
                label="Tiempo medio en catálogo"
                value={formatDurationSeconds(
                  traffic?.avgTimeOnCatalogSeconds ?? null,
                )}
                icon="schedule"
              />
            </div>
          )}

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-[320px] animate-pulse rounded-xl bg-slate-100" />
              <div className="h-[320px] animate-pulse rounded-xl bg-slate-100" />
            </div>
          ) : isTrafficEmpty(traffic) ? (
            <MetricsEmptyState
              title="Sin tráfico en este período"
              description="Comparte el enlace de tu catálogo o lanza campañas: las visitas y fuentes aparecerán aquí."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <BarChartCard
                title="Origen del tráfico"
                subtitle="Distribución aproximada (%)"
                data={trafficSourcesChart}
                horizontal
                height={280}
                formatValue={(v) => `${v}%`}
              />
              <div className="rounded-xl border border-[#eceff4] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <h3 className="text-base font-semibold text-slate-900">
                  Búsquedas principales
                </h3>
                <p className="mt-0.5 text-sm text-slate-500">
                  Ordenadas por volumen de visitas
                </p>
                <div className="mt-4">
                  <RankedSearchList
                    items={traffic?.topSearches ?? []}
                    empty={(traffic?.topSearches.length ?? 0) === 0}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      ) : null}

      {tab === "products" ? (
        <>
          {loading ? (
            <KpiSkeletonRow />
          ) : (
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Productos activos"
                value={products?.activeProducts.toLocaleString() ?? "0"}
                icon="inventory_2"
                iconBg="#EEF2FF"
                iconColor={theme.accent}
              />
              <StatCard
                label="Vistas totales"
                value={products?.totalViews.toLocaleString() ?? "0"}
                icon="visibility"
              />
              <StatCard
                label="Productos sin ventas"
                value={products?.productsWithNoSales.toLocaleString() ?? "0"}
                icon="remove_shopping_cart"
              />
              <StatCard
                label="Guardados / favoritos"
                value={products?.savedOrFavorited.toLocaleString() ?? "0"}
                icon="favorite"
              />
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              <div className="h-[360px] animate-pulse rounded-xl bg-slate-100" />
              <div className="h-[360px] animate-pulse rounded-xl bg-slate-100" />
            </div>
          ) : isProductsEmpty(products) ? (
            <MetricsEmptyState
              title="Sin analíticas de productos"
              description="Las vistas y el engagement aparecerán cuando los clientes naveguen por tu catálogo."
            />
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#eceff4] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <div className="mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5 text-indigo-500" aria-hidden />
                  <h3 className="text-base font-semibold text-slate-900">
                    Productos más vistos
                  </h3>
                </div>
                <RankedBarRows
                  rows={(products?.mostViewed ?? []).map((p) => ({
                    name: p.name,
                    value: p.count,
                  }))}
                  formatValue={(n) => n.toLocaleString()}
                  emptyTitle="Sin vistas de productos"
                  emptyDescription="Las vistas por producto se ordenarán aquí cuando haya datos."
                />
              </div>
              <div className="rounded-xl border border-[#eceff4] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <div className="mb-4 flex items-center gap-2">
                  <ShoppingCart
                    className="h-5 w-5 text-indigo-500"
                    aria-hidden
                  />
                  <h3 className="text-base font-semibold text-slate-900">
                    Tasa vista → carrito
                  </h3>
                </div>
                <RankedBarRows
                  rows={(products?.viewToCartRate ?? []).map((p) => ({
                    name: p.name,
                    value: p.ratePct,
                  }))}
                  formatValue={(n) => `${n.toFixed(1)}%`}
                  emptyTitle="Sin datos vista a carrito"
                  emptyDescription="Las tasas por producto se mostrarán cuando se registren los eventos."
                />
              </div>
            </div>
          )}
        </>
      ) : null}

      {tab === "sales" ? (
        <>
          {loading ? (
            <KpiSkeletonRow />
          ) : (
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Ingresos"
                value={formatCup(sales?.revenue ?? 0)}
                icon="payments"
                trend={changeTrend(sales?.revenueChangePct ?? null)?.text}
                trendUp={
                  changeTrend(sales?.revenueChangePct ?? null)?.trendUp ?? true
                }
              />
              <StatCard
                label="Pedidos"
                value={sales?.orders.toLocaleString() ?? "0"}
                icon="shopping_cart"
                trend={changeTrend(sales?.ordersChangePct ?? null)?.text}
                trendUp={
                  changeTrend(sales?.ordersChangePct ?? null)?.trendUp ?? true
                }
              />
              <StatCard
                label="Ticket medio"
                value={formatCup(sales?.avgOrderValue ?? 0)}
                icon="account_balance_wallet"
                trend={changeTrend(sales?.avgOrderValueChangePct ?? null)?.text}
                trendUp={
                  changeTrend(sales?.avgOrderValueChangePct ?? null)?.trendUp ??
                  true
                }
              />
              <StatCard
                label="Abandono de carrito"
                value={
                  sales?.cartAbandonmentRatePct != null
                    ? `${sales.cartAbandonmentRatePct.toFixed(1)}%`
                    : "—"
                }
                icon="remove_shopping_cart"
                trend={
                  changeTrend(sales?.cartAbandonmentChangePct ?? null, {
                    goodWhenDown: true,
                  })?.text
                }
                trendUp={
                  changeTrend(sales?.cartAbandonmentChangePct ?? null, {
                    goodWhenDown: true,
                  })?.trendUp ?? true
                }
              />
            </div>
          )}

          {loading ? (
            <div className="h-[400px] animate-pulse rounded-xl bg-slate-100" />
          ) : isSalesEmpty(sales) ? (
            <MetricsEmptyState
              title="Sin datos del embudo de ventas"
              description="Los pasos del embudo se rellenarán cuando haya pedidos completados en tu catálogo."
            />
          ) : (sales?.funnel?.length ?? 0) === 0 ? (
            <MetricsEmptyState
              title="Sin desglose del embudo"
              description="Los pasos aparecerán cuando existan eventos de visita y pago en este período."
            />
          ) : (
            <ConversionFunnel steps={sales?.funnel ?? []} />
          )}
        </>
      ) : null}

      {tab === "customers" ? (
        <>
          {loading ? (
            <KpiSkeletonRow />
          ) : (
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Compradores nuevos"
                value={(customers?.newBuyers ?? 0).toLocaleString()}
                icon="person_add"
              />
              <StatCard
                label="Compradores recurrentes"
                value={(customers?.returningBuyers ?? 0).toLocaleString()}
                icon="groups"
              />
              <StatCard
                label="Valoración media"
                value={
                  customers?.avgRating != null
                    ? customers.avgRating.toFixed(1)
                    : "—"
                }
                icon="star"
              />
              <StatCard
                label="Reseñas recibidas"
                value={(customers?.reviewsReceived ?? 0).toLocaleString()}
                icon="rate_review"
              />
            </div>
          )}

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-[320px] animate-pulse rounded-xl bg-slate-100" />
              <div className="h-[320px] animate-pulse rounded-xl bg-slate-100" />
            </div>
          ) : isCustomersEmpty(customers) ? (
            <MetricsEmptyState
              title="Sin datos de clientes"
              description="La mezcla de compradores, valoraciones y volumen de reseñas aparecerá cuando haya actividad."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-[#eceff4] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <div className="mb-2 flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-500" aria-hidden />
                  <h3 className="text-base font-semibold text-slate-900">
                    Nuevos vs recurrentes
                  </h3>
                </div>
                {donutBuyers[0].value === 0 && donutBuyers[1].value === 0 ? (
                  <MetricsEmptyState
                    title="Sin reparto de compradores"
                    description="Los conteos de nuevos y recurrentes aparecerán cuando haya datos de compra."
                  />
                ) : (
                  <div style={{ width: "100%", height: 280, minHeight: 280 }}>
                    <ReactApexChart
                      options={donutBuyersOptions}
                      series={donutBuyers.map((d) => d.value)}
                      type="donut"
                      height={280}
                    />
                  </div>
                )}
                <ul className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600">
                  {donutBuyers.map((d, i) => (
                    <li key={d.name} className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          background: theme.chart[i % theme.chart.length],
                        }}
                        aria-hidden
                      />
                      {d.name}:{" "}
                      <span className="font-semibold text-slate-800">
                        {d.value.toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-[#eceff4] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                <div className="mb-4 flex items-center gap-2">
                  <Star className="h-5 w-5 text-indigo-500" aria-hidden />
                  <h3 className="text-base font-semibold text-slate-900">
                    Distribución de valoraciones
                  </h3>
                </div>
                {ratingsBars.every((b) => b.value === 0) ? (
                  <MetricsEmptyState
                    title="Sin valoraciones"
                    description="Las estrellas se acumularán aquí cuando los clientes dejen reseñas."
                  />
                ) : (
                  <div style={{ width: "100%", height: 280, minHeight: 280 }}>
                    <ReactApexChart
                      options={ratingsOptions}
                      series={[{ name: "Valoraciones", data: ratingsBars.map((b) => b.value) }]}
                      type="bar"
                      height={280}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
