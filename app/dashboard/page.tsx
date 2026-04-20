"use client";

import { useMemo, useState } from "react";
import {
  ComposedChartCard,
  LineChartCard,
  ListCard,
  PieChartCard,
  StatCard,
  theme,
} from "@/components/dashboard";
import { useDisplayCurrency } from "@/contexts/DisplayCurrencyContext";
import { useUserPermissionCodes } from "@/lib/useUserPermissionCodes";
import type {
  DashboardKpiPeriod,
  DashboardSummary,
} from "./_service/dashboardApi";
import {
  useGetCategoryDistributionQuery,
  useGetEntriesVsExitsQuery,
  useGetGrossSalesProfitKpiQuery,
  useGetInventoryFlowQuery,
  useGetListLatestMovementsQuery,
  useGetListLowStockQuery,
  useGetListRecentProductsQuery,
  useGetListTopMovementsQuery,
  useGetListValueByLocationQuery,
  useGetLowStockAlertsByDayQuery,
  useGetNetSalesProfitKpiQuery,
  useGetStockStatusQuery,
  useGetSummaryQuery,
} from "./_service/dashboardApi";
import { useGetOrdersQuery } from "./sales/_service/salesApi";

// ─── Fallbacks estáticos (si la API no está disponible o falla) ─────────────

function getFallbackKpis(formatCup: (n: number) => string) {
  return [
    {
      label: "Total Productos",
      value: "1,284",
      icon: "inventory_2" as const,
      trend: "+12% vs mes pasado",
      trendUp: true,
      iconBg: "#EEF2FF",
      iconColor: theme.accent,
    },
    {
      label: "Valor Inventario",
      value: formatCup(45200),
      icon: "payments" as const,
      iconBg: "#F0FDF4",
      iconColor: theme.success,
    },
    {
      label: "Stock Bajo",
      value: "18",
      icon: "warning" as const,
      trend: "-2 desde ayer",
      trendUp: false,
      iconBg: "#FEF2F2",
      iconColor: theme.error,
    },
    {
      label: "Órdenes Semanales",
      value: "156",
      icon: "shopping_cart" as const,
      trend: "+22% vs mes pasado",
      trendUp: true,
      iconBg: "#EEF2FF",
      iconColor: theme.accent,
    },
  ];
}

const FALLBACK_FLOW = [
  { label: "Lun", value: 45 },
  { label: "Mar", value: 52 },
  { label: "Mié", value: 48 },
  { label: "Jue", value: 70 },
  { label: "Vie", value: 65 },
  { label: "Sáb", value: 85 },
  { label: "Dom", value: 92 },
];

const FALLBACK_CATEGORY_PIE = [
  { name: "Electrónica", value: 40 },
  { name: "Hogar", value: 25 },
  { name: "Oficina", value: 20 },
  { name: "Otros", value: 15 },
];

const FALLBACK_ESTADO_STOCK = [
  { name: "En rango", value: 72 },
  { name: "Bajo", value: 18 },
  { name: "Crítico", value: 10 },
];

const FALLBACK_ENTRADAS_SALIDAS = [
  { label: "Lun", value: 120, lineValue: 95 },
  { label: "Mar", value: 145, lineValue: 110 },
  { label: "Mié", value: 98, lineValue: 130 },
  { label: "Jue", value: 165, lineValue: 140 },
  { label: "Vie", value: 132, lineValue: 125 },
  { label: "Sáb", value: 88, lineValue: 70 },
  { label: "Dom", value: 55, lineValue: 48 },
];

const FALLBACK_ALERTAS = [
  { label: "Lun", value: 4 },
  { label: "Mar", value: 2 },
  { label: "Mié", value: 5 },
  { label: "Jue", value: 3 },
  { label: "Vie", value: 1 },
  { label: "Sáb", value: 0 },
  { label: "Dom", value: 2 },
];

const FALLBACK_LIST_TOP: { primary: string; secondary?: string }[] = [
  { primary: 'Monitor 24"', secondary: "340 mov. · Últimos 30 días" },
  { primary: "Teclado MX Keys", secondary: "285 mov." },
  { primary: "Mouse Logitech MX", secondary: "260 mov." },
  { primary: "USB 32GB", secondary: "198 mov." },
  { primary: "Hub USB-C", secondary: "165 mov." },
];

const FALLBACK_LIST_MOV: { primary: string; secondary?: string }[] = [
  { primary: 'Entrada · Monitor 24"', secondary: "Hace 15 min" },
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
  { primary: 'Monitor 24"', secondary: "Añadido hace 2 días" },
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
  const fmt = (n: number | undefined) =>
    n != null ? n.toLocaleString("es") : "—";
  const trendStr = (n: number | undefined, suffix = "%") =>
    n != null ? (n >= 0 ? `+${n}${suffix}` : `${n}${suffix}`) : "";
  return [
    {
      label: "Total Productos",
      value: fmt(k.totalProducts),
      icon: "inventory_2" as const,
      trend: `${trendStr(k.totalProductsTrend)} vs mes pasado`,
      trendUp: (k.totalProductsTrend ?? 0) >= 0,
      iconBg: "#EEF2FF",
      iconColor: theme.accent,
    },
    {
      label: "Valor Inventario",
      value:
        k.inventoryValue != null
          ? formatCup(k.inventoryValue)
          : formatCup(45200),
      icon: "payments" as const,
      iconBg: "#F0FDF4",
      iconColor: theme.success,
    },
    {
      label: "Stock Bajo",
      value: fmt(k.lowStockCount),
      icon: "warning" as const,
      trend:
        k.lowStockChange != null
          ? (k.lowStockChange >= 0 ? "+" : "") +
            k.lowStockChange +
            " desde ayer"
          : "-2 desde ayer",
      trendUp: (k.lowStockChange ?? 0) <= 0,
      iconBg: "#FEF2F2",
      iconColor: theme.error,
    },
    {
      label: "Órdenes Semanales",
      value: fmt(k.weeklyOrders),
      icon: "shopping_cart" as const,
      trend: `${trendStr(k.weeklyOrdersTrend)} vs mes pasado`,
      trendUp: (k.weeklyOrdersTrend ?? 0) >= 0,
      iconBg: "#EEF2FF",
      iconColor: theme.accent,
    },
  ];
}

const KPI_PERIOD_OPTIONS: { value: DashboardKpiPeriod; label: string }[] = [
  { value: "day", label: "Diario" },
  { value: "week", label: "Semanal" },
  { value: "month", label: "Mensual" },
  { value: "year", label: "Anual" },
];

export default function DashboardPage() {
  const { formatCup } = useDisplayCurrency();
  const { has: hasPermission } = useUserPermissionCodes();
  const canSaleRead = hasPermission("sale.read");
  const [kpiPeriod, setKpiPeriod] = useState<DashboardKpiPeriod>("month");

  const grossKpi = useGetGrossSalesProfitKpiQuery(kpiPeriod, {
    skip: !canSaleRead,
  });
  const netKpi = useGetNetSalesProfitKpiQuery(kpiPeriod, {
    skip: !canSaleRead,
  });
  const { data: summary } = useGetSummaryQuery(undefined);
  const { data: flowData } = useGetInventoryFlowQuery(undefined);
  const { data: categoryData } = useGetCategoryDistributionQuery();
  const { data: stockStatusData } = useGetStockStatusQuery();
  const { data: entriesExitsData } = useGetEntriesVsExitsQuery(undefined);
  const { data: alertsData } = useGetLowStockAlertsByDayQuery(undefined);
  const { data: listTop } = useGetListTopMovementsQuery(undefined);
  const { data: listLow, isLoading: listLowLoading } =
    useGetListLowStockQuery(undefined);
  const { data: listMov } = useGetListLatestMovementsQuery(undefined);
  const { data: listLoc } = useGetListValueByLocationQuery(undefined);
  const { data: listRecent } = useGetListRecentProductsQuery(undefined);
  const { data: recentOrdersResult } = useGetOrdersQuery({
    page: 1,
    perPage: 5,
    sortOrder: "desc",
  });

  const kpis = useMemo(
    () => buildKpisFromSummary(summary ?? null, formatCup),
    [summary, formatCup],
  );
  const flow = flowData && flowData.length > 0 ? flowData : FALLBACK_FLOW;
  const categoryPie =
    categoryData && categoryData.length > 0
      ? categoryData
      : FALLBACK_CATEGORY_PIE;
  const estadoStock =
    stockStatusData && stockStatusData.length > 0
      ? stockStatusData
      : FALLBACK_ESTADO_STOCK;
  const entradasSalidas =
    entriesExitsData && entriesExitsData.length > 0
      ? entriesExitsData
      : FALLBACK_ENTRADAS_SALIDAS;
  const alertas =
    alertsData && alertsData.length > 0 ? alertsData : FALLBACK_ALERTAS;
  const listTopMov =
    listTop && listTop.length > 0 ? listTop : FALLBACK_LIST_TOP;
  const listLowStock: { primary: string; secondary?: string }[] = listLowLoading
    ? [{ primary: "Cargando…", secondary: "" }]
    : listLow && listLow.length > 0
      ? listLow
      : [{ primary: "No hay productos con stock bajo", secondary: "" }];
  const listLatestMov =
    listMov && listMov.length > 0 ? listMov : FALLBACK_LIST_MOV;
  const listValLoc =
    listLoc && listLoc.length > 0 ? listLoc : FALLBACK_LIST_LOC;
  const listRecentProd =
    listRecent && listRecent.length > 0 ? listRecent : FALLBACK_LIST_RECENT;

  const recentOrdersList: { primary: string; secondary?: string }[] =
    recentOrdersResult?.data && recentOrdersResult.data.length > 0
      ? recentOrdersResult.data.map((o) => ({
          primary: `${o.folio ?? `#${o.id}`} · ${o.locationName ?? "—"}`,
          secondary: `${
            (o.status ?? "").toLowerCase() === "confirmed"
              ? "Aceptada"
              : (o.status ?? "").toLowerCase() === "cancelled" ||
                  (o.status ?? "").toLowerCase() === "canceled"
                ? "Cancelada"
                : "Pendiente"
          } · ${formatCup(o.total ?? 0)}`,
        }))
      : [{ primary: "Sin órdenes recientes" }];

  return (
    <div className="dashboard-page">
      <div className="dashboard-page__header">
        <h1>Panel de Control</h1>
        <p>
          Bienvenido de nuevo. Resumen general del inventario. Desplázate para
          ver listas y gráficos.
        </p>
      </div>

      {/* ── Ganancia ventas (prioridad: permiso sale.read) ─────────────────── */}
      {canSaleRead ? (
        <section style={{ marginBottom: 8 }}>
          <h2 className="dashboard-section-title">Ganancia de ventas</h2>
          <div style={{ marginBottom: 4 }}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 8,
              }}
            >
              <h3
                className="dashboard-section-title"
                style={{
                  margin: 0,
                  fontSize: "1rem",
                  fontWeight: 700,
                }}
              >
                Bruto y neto
              </h3>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 14,
                  color: theme.secondaryText,
                }}
              >
                <span>Período</span>
                <select
                  value={kpiPeriod}
                  onChange={(e) =>
                    setKpiPeriod(e.target.value as DashboardKpiPeriod)
                  }
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: `1px solid ${theme.divider}`,
                    fontSize: 14,
                    minWidth: 160,
                  }}
                >
                  {KPI_PERIOD_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p
              style={{
                margin: "0 0 14px",
                fontSize: 12,
                color: theme.secondaryText,
                lineHeight: 1.45,
              }}
            >
              Solo ventas confirmadas, sin contar devoluciones.
            </p>
            <div className="dashboard-flex-row">
              <StatCard
                label="Ingreso bruto"
                value={
                  grossKpi.isLoading || grossKpi.isFetching
                    ? "…"
                    : grossKpi.isError
                      ? "—"
                      : formatCup(grossKpi.data?.grossProfit ?? 0)
                }
                icon="trending_up"
                trend={
                  grossKpi.data
                    ? `${grossKpi.data.orderCount} ventas en el período`
                    : grossKpi.isError
                      ? "No se pudo cargar"
                      : ""
                }
                trendUp
                iconBg="#ECFDF5"
                iconColor={theme.success}
              />
              <StatCard
                label="Ganancia neta"
                value={
                  netKpi.isLoading || netKpi.isFetching
                    ? "…"
                    : netKpi.isError
                      ? "—"
                      : formatCup(netKpi.data?.netProfit ?? 0)
                }
                icon="account_balance"
                trend={
                  netKpi.data
                    ? `${netKpi.data.orderCount} ventas (mismo criterio)`
                    : netKpi.isError
                      ? "No se pudo cargar"
                      : ""
                }
                trendUp
                iconBg="#EEF2FF"
                iconColor={theme.accent}
              />
            </div>
          </div>
        </section>
      ) : null}

      {/* ── KPIs de inventario ─────────────────────────────────────────────── */}
      <h2 className="dashboard-section-title">Inventario en resumen</h2>
      <div className="dashboard-flex-row">
        {kpis.map((kpi) => (
          <StatCard key={kpi.label} {...kpi} />
        ))}
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
        <LineChartCard
          title="Flujo de Inventario"
          subtitle="Entradas vs salidas (últimos 7 días)"
          data={flow}
          height={280}
        />
        <PieChartCard
          title="Categorías Populares"
          data={categoryPie}
          height={280}
        />
      </section>

      <section className="dashboard-flex-row">
        <LineChartCard
          title="Alertas de stock bajo por día"
          subtitle="Última semana"
          data={alertas}
          height={280}
          color={theme.error}
          filled
        />
        <div style={{ flex: "0 1 460px", minWidth: 320, maxWidth: 520 }}>
          <PieChartCard
            title="Estado del stock (En rango / Bajo / Crítico)"
            data={estadoStock}
            height={280}
            colors={[theme.success, "#F59E0B", theme.error]}
          />
        </div>
      </section>

      <section className="dashboard-flex-row">
        <ListCard
          title="Productos con más movimientos"
          items={listTopMov}
          href="/dashboard/movements"
          icon="trending_up"
          maxItems={5}
        />
        <ListCard
          title="Productos con stock bajo"
          items={listLowStock}
          href="/dashboard/inventory"
          icon="warning"
          maxItems={5}
        />
        <ListCard
          title="Últimos movimientos"
          items={listLatestMov}
          href="/dashboard/movements"
          icon="swap_horiz"
          maxItems={5}
        />
      </section>

      <section className="dashboard-flex-row">
        <ComposedChartCard
          title="Entradas vs Salidas por día"
          subtitle="Barras: entradas · Línea: salidas"
          data={entradasSalidas}
          height={280}
          lineName="Salidas"
          barColor={theme.accent}
          lineColor={theme.error}
        />
        <ListCard
          title="Valor por ubicación"
          items={listValLoc}
          href="/dashboard/inventory"
          icon="location_on"
          maxItems={4}
        />
      </section>

      <section className="dashboard-flex-row">
        <ListCard
          title="Productos añadidos recientemente"
          items={listRecentProd}
          href="/dashboard/products"
          icon="inventory_2"
          maxItems={5}
        />
      </section>
    </div>
  );
}
