"use client";

import { useMemo } from "react";
import {
  StatCard,
  LineChartCard,
  ComposedChartCard,
  PieChartCard,
  ListCard,
  theme,
} from "@/components/dashboard";
import {
  useGetSummaryQuery,
  useGetInventoryFlowQuery,
  useGetCategoryDistributionQuery,
  useGetInventoryValueEvolutionQuery,
  useGetStockStatusQuery,
  useGetEntriesVsExitsQuery,
  useGetLowStockAlertsByDayQuery,
  useGetListTopMovementsQuery,
  useGetListLowStockQuery,
  useGetListLatestMovementsQuery,
  useGetListValueByLocationQuery,
  useGetListRecentProductsQuery,
} from "./_service/dashboardApi";
import type { DashboardSummary } from "./_service/dashboardApi";
import { useGetOrderStatsQuery, useGetOrdersQuery } from "./sales/_service/salesApi";
import { useDisplayCurrency } from "@/contexts/DisplayCurrencyContext";
import { cupToDisplayAmount, roundPriceDecimals } from "@/lib/displayCurrencyFormat";

// ─── Fallbacks estáticos (si la API no está disponible o falla) ─────────────

function getFallbackKpis(formatCup: (n: number) => string) {
  return [
  { label: "Total Productos", value: "1,284", icon: "inventory_2" as const, trend: "+12% vs mes pasado", trendUp: true, iconBg: "#EEF2FF", iconColor: theme.accent },
  { label: "Valor Inventario", value: formatCup(45200), icon: "payments" as const, iconBg: "#F0FDF4", iconColor: theme.success },
  { label: "Stock Bajo", value: "18", icon: "warning" as const, trend: "-2 desde ayer", trendUp: false, iconBg: "#FEF2F2", iconColor: theme.error },
  { label: "Órdenes Semanales", value: "156", icon: "shopping_cart" as const, trend: "+22% vs mes pasado", trendUp: true, iconBg: "#EEF2FF", iconColor: theme.accent },
];
}

const FALLBACK_FLOW = [
  { label: "Lun", value: 45 }, { label: "Mar", value: 52 }, { label: "Mié", value: 48 },
  { label: "Jue", value: 70 }, { label: "Vie", value: 65 }, { label: "Sáb", value: 85 }, { label: "Dom", value: 92 },
];

const FALLBACK_CATEGORY_PIE = [
  { name: "Electrónica", value: 40 }, { name: "Hogar", value: 25 }, { name: "Oficina", value: 20 }, { name: "Otros", value: 15 },
];

const FALLBACK_EVOLUCION = [
  { label: "Sep", value: 38 }, { label: "Oct", value: 41 }, { label: "Nov", value: 42 },
  { label: "Dic", value: 44 }, { label: "Ene", value: 43 }, { label: "Feb", value: 45 },
];

const FALLBACK_ESTADO_STOCK = [
  { name: "En rango", value: 72 }, { name: "Bajo", value: 18 }, { name: "Crítico", value: 10 },
];

const FALLBACK_ENTRADAS_SALIDAS = [
  { label: "Lun", value: 120, lineValue: 95 }, { label: "Mar", value: 145, lineValue: 110 },
  { label: "Mié", value: 98, lineValue: 130 }, { label: "Jue", value: 165, lineValue: 140 },
  { label: "Vie", value: 132, lineValue: 125 }, { label: "Sáb", value: 88, lineValue: 70 }, { label: "Dom", value: 55, lineValue: 48 },
];

const FALLBACK_ALERTAS = [
  { label: "Lun", value: 4 }, { label: "Mar", value: 2 }, { label: "Mié", value: 5 }, { label: "Jue", value: 3 },
  { label: "Vie", value: 1 }, { label: "Sáb", value: 0 }, { label: "Dom", value: 2 },
];

const FALLBACK_LIST_TOP: { primary: string; secondary?: string }[] = [
  { primary: "Monitor 24\"", secondary: "340 mov. · Últimos 30 días" },
  { primary: "Teclado MX Keys", secondary: "285 mov." },
  { primary: "Mouse Logitech MX", secondary: "260 mov." },
  { primary: "USB 32GB", secondary: "198 mov." },
  { primary: "Hub USB-C", secondary: "165 mov." },
];

const FALLBACK_LIST_MOV: { primary: string; secondary?: string }[] = [
  { primary: "Entrada · Monitor 24\"", secondary: "Hace 15 min" },
  { primary: "Salida · Teclado MX", secondary: "Hace 1 h" },
  { primary: "Ajuste · USB 32GB", secondary: "Hace 2 h" },
  { primary: "Entrada · Hub USB-C", secondary: "Hace 3 h" },
  { primary: "Salida · Mouse Logi", secondary: "Hace 4 h" },
];

const FALLBACK_LIST_LOC: { primary: string; secondary?: string }[] = [
  { primary: "Almacén Central", secondary: "~22k" },
  { primary: "Sucursal Norte", secondary: "~12k" },
  { primary: "Sucursal Sur", secondary: "~8k" },
  { primary: "Showroom", secondary: "~3k" },
];

const FALLBACK_LIST_RECENT: { primary: string; secondary?: string }[] = [
  { primary: "Monitor 24\"", secondary: "Añadido hace 2 días" },
  { primary: "Webcam HD", secondary: "Añadido hace 5 días" },
  { primary: "Base portátil", secondary: "Añadido hace 1 semana" },
  { primary: "Cargador USB-C", secondary: "Añadido hace 1 semana" },
  { primary: "Funda laptop", secondary: "Añadido hace 2 semanas" },
];

function buildKpisFromSummary(
  s: DashboardSummary | null | undefined,
  formatCup: (n: number) => string,
) {
  if (!s) return getFallbackKpis(formatCup);
  const k: DashboardSummary = s;
  const fmt = (n: number | undefined) => (n != null ? n.toLocaleString("es") : "—");
  const trendStr = (n: number | undefined, suffix = "%") => (n != null ? (n >= 0 ? `+${n}${suffix}` : `${n}${suffix}`) : "");
  return [
    { label: "Total Productos", value: fmt(k.totalProducts), icon: "inventory_2" as const, trend: trendStr(k.totalProductsTrend) + " vs mes pasado", trendUp: (k.totalProductsTrend ?? 0) >= 0, iconBg: "#EEF2FF", iconColor: theme.accent },
    {
      label: "Valor Inventario",
      value: k.inventoryValue != null ? formatCup(k.inventoryValue) : formatCup(45200),
      icon: "payments" as const,
      iconBg: "#F0FDF4",
      iconColor: theme.success,
    },
    { label: "Stock Bajo", value: fmt(k.lowStockCount), icon: "warning" as const, trend: (k.lowStockChange != null ? (k.lowStockChange >= 0 ? "+" : "") + k.lowStockChange + " desde ayer" : "-2 desde ayer"), trendUp: (k.lowStockChange ?? 0) <= 0, iconBg: "#FEF2F2", iconColor: theme.error },
    { label: "Órdenes Semanales", value: fmt(k.weeklyOrders), icon: "shopping_cart" as const, trend: trendStr(k.weeklyOrdersTrend) + " vs mes pasado", trendUp: (k.weeklyOrdersTrend ?? 0) >= 0, iconBg: "#EEF2FF", iconColor: theme.accent },
  ];
}

export default function DashboardPage() {
  const { formatCup, selectedCurrency, priceDecimals } = useDisplayCurrency();
  const { data: summary } = useGetSummaryQuery();
  const { data: flowData } = useGetInventoryFlowQuery();
  const { data: categoryData } = useGetCategoryDistributionQuery();
  const { data: evolutionData } = useGetInventoryValueEvolutionQuery();
  const { data: stockStatusData } = useGetStockStatusQuery();
  const { data: entriesExitsData } = useGetEntriesVsExitsQuery();
  const { data: alertsData } = useGetLowStockAlertsByDayQuery();
  const { data: listTop } = useGetListTopMovementsQuery();
  const { data: listLow, isLoading: listLowLoading } = useGetListLowStockQuery();
  const { data: listMov } = useGetListLatestMovementsQuery();
  const { data: listLoc } = useGetListValueByLocationQuery();
  const { data: listRecent } = useGetListRecentProductsQuery();
  const { data: salesStats } = useGetOrderStatsQuery(30);
  const { data: recentOrdersResult } = useGetOrdersQuery({ page: 1, perPage: 5, sortOrder: "desc" });

  const kpis = useMemo(
    () => buildKpisFromSummary(summary ?? null, formatCup),
    [summary, formatCup],
  );
  const flow = (flowData && flowData.length > 0) ? flowData : FALLBACK_FLOW;
  const categoryPie = (categoryData && categoryData.length > 0) ? categoryData : FALLBACK_CATEGORY_PIE;
  const evolution = useMemo(() => {
    const raw = (evolutionData && evolutionData.length > 0) ? evolutionData : FALLBACK_EVOLUCION;
    const rate = selectedCurrency.exchangeRate;
    return raw.map((d) => ({
      label: d.label,
      value: roundPriceDecimals(cupToDisplayAmount(d.value * 1000, rate) / 1000, priceDecimals),
    }));
  }, [evolutionData, selectedCurrency.exchangeRate, priceDecimals]);
  const estadoStock = (stockStatusData && stockStatusData.length > 0) ? stockStatusData : FALLBACK_ESTADO_STOCK;
  const entradasSalidas = (entriesExitsData && entriesExitsData.length > 0) ? entriesExitsData : FALLBACK_ENTRADAS_SALIDAS;
  const alertas = (alertsData && alertsData.length > 0) ? alertsData : FALLBACK_ALERTAS;
  const listTopMov = (listTop && listTop.length > 0) ? listTop : FALLBACK_LIST_TOP;
  const listLowStock: { primary: string; secondary?: string }[] =
    listLowLoading
      ? [{ primary: "Cargando…", secondary: "" }]
      : (listLow && listLow.length > 0)
        ? listLow
        : [{ primary: "No hay productos con stock bajo", secondary: "" }];
  const listLatestMov = (listMov && listMov.length > 0) ? listMov : FALLBACK_LIST_MOV;
  const listValLoc = (listLoc && listLoc.length > 0) ? listLoc : FALLBACK_LIST_LOC;
  const listRecentProd = (listRecent && listRecent.length > 0) ? listRecent : FALLBACK_LIST_RECENT;

  // ── Ventas ──────────────────────────────────────────────────────────────────
  const ss = salesStats as Record<string, number> | null | undefined;
  const fmtMoney = (n: number | undefined) =>
    n != null ? formatCup(n) : "—";
  const fmtNum = (n: number | undefined) => (n != null ? String(n) : "—");

  const salesKpis = [
    {
      label: "Órdenes (30 días)",
      value: fmtNum(ss?.totalOrders),
      icon: "receipt_long" as const,
      trend: ss?.confirmedOrders != null ? `${ss.confirmedOrders} confirmadas` : "",
      trendUp: true,
      iconBg: "#EEF2FF",
      iconColor: theme.accent,
    },
    {
      label: "Ventas confirmadas",
      value: fmtNum(ss?.confirmedOrders),
      icon: "check_circle" as const,
      trend: ss?.totalOrders != null && ss?.confirmedOrders != null
        ? `${Math.round((ss.confirmedOrders / ss.totalOrders) * 100) || 0}% del total`
        : "",
      trendUp: true,
      iconBg: "#F0FDF4",
      iconColor: theme.success,
    },
    {
      label: "Pendientes",
      value: fmtNum(ss?.draftOrders),
      icon: "edit_note" as const,
      trend: "Por aceptar o cancelar",
      trendUp: false,
      iconBg: "#FFFBEB",
      iconColor: "#F59E0B",
    },
    {
      label: "Total vendido",
      value: fmtMoney(ss?.totalRevenue ?? ss?.totalAmount),
      icon: "point_of_sale" as const,
      iconBg: "#F0FDF4",
      iconColor: theme.success,
    },
  ];

  const recentOrdersList: { primary: string; secondary?: string }[] =
    recentOrdersResult?.data && recentOrdersResult.data.length > 0
      ? recentOrdersResult.data.map((o) => ({
          primary: `${o.folio ?? `#${o.id}`} · ${o.locationName ?? "—"}`,
          secondary: `${
            (o.status ?? "").toLowerCase() === "confirmed" ? "Aceptada" :
            (o.status ?? "").toLowerCase() === "cancelled" || (o.status ?? "").toLowerCase() === "canceled" ? "Cancelada" : "Pendiente"
          } · ${formatCup(o.total ?? 0)}`,
        }))
      : [{ primary: "Sin órdenes recientes" }];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        width: "100%",
        overflowY: "auto",
        paddingBottom: 32,
        boxSizing: "border-box",
      }}
    >
      <div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 4, color: theme.primaryText }}>
          Panel de Control
        </h1>
        <p style={{ color: theme.secondaryText, fontSize: "0.9rem" }}>
          Bienvenido de nuevo. Resumen general del inventario. Desplázate para ver listas y gráficos.
        </p>
      </div>

      {/* ── KPIs de inventario ─────────────────────────────────────────────── */}
      <div className="dashboard-flex-row">
        {kpis.map((kpi) => (
          <StatCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* ── Ventas ─────────────────────────────────────────────────────────── */}
      <div>
        <h2 style={{ fontSize: "1rem", fontWeight: 600, color: theme.primaryText, marginBottom: 12 }}>
          Ventas · últimos 30 días
        </h2>
        <div className="dashboard-flex-row">
          {salesKpis.map((kpi) => (
            <StatCard key={kpi.label} {...kpi} />
          ))}
        </div>
      </div>

      <section className="dashboard-flex-row">
        <ListCard
          title="Órdenes de venta recientes"
          items={recentOrdersList}
          href="/dashboard/sales"
          icon="receipt_long"
          maxItems={5}
        />
      </section>

      <section className="dashboard-flex-row">
        <LineChartCard title="Flujo de Inventario" subtitle="Entradas vs salidas (últimos 7 días)" data={flow} height={280} />
        <PieChartCard title="Categorías Populares" data={categoryPie} height={280} />
      </section>

      <section className="dashboard-flex-row">
        <LineChartCard
          title="Evolución del valor del inventario"
          subtitle={`Últimos 6 meses (miles ${selectedCurrency.code})`}
          data={evolution}
          height={280}
          filled={false}
        />
        <PieChartCard title="Estado del stock (En rango / Bajo / Crítico)" data={estadoStock} height={280} colors={[theme.success, "#F59E0B", theme.error]} />
      </section>

      <section className="dashboard-flex-row">
        <ListCard title="Productos con más movimientos" items={listTopMov} href="/dashboard/movements" icon="trending_up" maxItems={5} />
        <ListCard title="Productos con stock bajo" items={listLowStock} href="/dashboard/inventory" icon="warning" maxItems={5} />
        <ListCard title="Últimos movimientos" items={listLatestMov} href="/dashboard/movements" icon="swap_horiz" maxItems={5} />
      </section>

      <section className="dashboard-flex-row">
        <ComposedChartCard title="Entradas vs Salidas por día" subtitle="Barras: entradas · Línea: salidas" data={entradasSalidas} height={280} lineName="Salidas" barColor={theme.accent} lineColor={theme.error} />
        <ListCard title="Valor por ubicación" items={listValLoc} href="/dashboard/inventory" icon="location_on" maxItems={4} />
      </section>

      <section className="dashboard-flex-row">
        <ListCard title="Productos añadidos recientemente" items={listRecentProd} href="/dashboard/products" icon="inventory_2" maxItems={5} />
        <LineChartCard title="Alertas de stock bajo por día" subtitle="Última semana" data={alertas} height={280} color={theme.error} filled />
      </section>
    </div>
  );
}
