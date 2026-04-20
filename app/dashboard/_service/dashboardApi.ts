import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { parseChartResult, parseSummaryResult } from "@/lib/api-utils";
import { getApiUrl, getToken } from "@/lib/auth-api";

// ─── Tipos para gráficos/listas (formato API) ─────────────────────────────────

export interface ChartPoint {
  label: string;
  value: number;
  date?: string;
}

export interface ChartPointWithLine {
  label: string;
  value: number;
  lineValue?: number;
}

export interface PiePoint {
  name: string;
  value: number;
}

export interface ListItem {
  primary: string;
  secondary?: string;
}

/** Celda del heatmap: día de la semana (0=Lun … 6=Dom), hora (0–23), cantidad de movimientos. */
export interface ActivityHeatmapCell {
  dayOfWeek: number;
  hour: number;
  count: number;
}

export interface DashboardSummary {
  totalProducts?: number;
  totalProductsTrend?: number;
  inventoryValue?: number;
  inventoryValueTrend?: number;
  lowStockCount?: number;
  lowStockChange?: number;
  weeklyOrders?: number;
  weeklyOrdersTrend?: number;
}

/** Query `period` para KPIs GET /dashboard/kpi/*. */
export type DashboardKpiPeriod = "day" | "week" | "month" | "year";

/** GET /api/dashboard/kpi/gross-sales-profit */
export interface GrossSalesProfitKpiResult {
  period: string;
  fromUtc: string;
  toUtcExclusive: string;
  grossProfit: number;
  orderCount: number;
}

/** GET /api/dashboard/kpi/net-sales-profit */
export interface NetSalesProfitKpiResult {
  period: string;
  fromUtc: string;
  toUtcExclusive: string;
  netProfit: number;
  orderCount: number;
}

function unwrapKpi<T>(raw: unknown, label: string): T {
  const v = parseSummaryResult<T>(raw);
  if (v && typeof v === "object") return v;
  throw new Error(`Respuesta KPI inválida: ${label}`);
}

interface DashboardQuery {
  from?: string;
  to?: string;
  days?: number;
  months?: number;
  limit?: number;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const dashboardApi = createApi({
  reducerPath: "dashboardApi",
  baseQuery: fetchBaseQuery({
    baseUrl: getApiUrl(),
    prepareHeaders: (headers) => {
      const token = getToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      headers.set("Content-Type", "application/json");
      headers.set("ngrok-skip-browser-warning", "true");
      return headers;
    },
  }),
  refetchOnMountOrArgChange: true,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  tagTypes: ["DashboardStats"],
  endpoints: (builder) => ({
    getSummary: builder.query<
      DashboardSummary | null,
      DashboardQuery | undefined
    >({
      query: (arg) => {
        const params = new URLSearchParams();
        if (arg?.from) params.set("from", arg.from);
        if (arg?.to) params.set("to", arg.to);
        const q = params.toString();
        return `/dashboard/summary${q ? `?${q}` : ""}`;
      },
      transformResponse: parseSummaryResult<DashboardSummary>,
    }),
    getInventoryFlow: builder.query<ChartPoint[], DashboardQuery | undefined>({
      query: (arg) => {
        const params = new URLSearchParams();
        const a = arg as DashboardQuery | undefined;
        params.set("days", String(a?.days ?? 7));
        if (a?.from) params.set("from", a.from);
        if (a?.to) params.set("to", a.to);
        return `/dashboard/inventory-flow?${params.toString()}`;
      },
      transformResponse: (raw: unknown) => parseChartResult<ChartPoint>(raw),
    }),
    getCategoryDistribution: builder.query<PiePoint[], void>({
      query: () => "/dashboard/category-distribution",
      transformResponse: (raw: unknown) => parseChartResult<PiePoint>(raw),
    }),
    getInventoryValueEvolution: builder.query<
      ChartPoint[],
      DashboardQuery | undefined
    >({
      query: (arg) => {
        const params = new URLSearchParams();
        const a = arg as DashboardQuery | undefined;
        params.set("months", String(a?.months ?? 6));
        if (a?.from) params.set("from", a.from);
        if (a?.to) params.set("to", a.to);
        return `/dashboard/inventory-value-evolution?${params.toString()}`;
      },
      transformResponse: (raw: unknown) => parseChartResult<ChartPoint>(raw),
    }),
    getStockStatus: builder.query<PiePoint[], void>({
      query: () => "/dashboard/stock-status",
      transformResponse: (raw: unknown) => parseChartResult<PiePoint>(raw),
    }),
    getEntriesVsExits: builder.query<
      ChartPointWithLine[],
      DashboardQuery | undefined
    >({
      query: (arg) => {
        const params = new URLSearchParams();
        const a = arg as DashboardQuery | undefined;
        params.set("days", String(a?.days ?? 7));
        if (a?.from) params.set("from", a.from);
        if (a?.to) params.set("to", a.to);
        return `/dashboard/entries-vs-exits?${params.toString()}`;
      },
      transformResponse: (raw: unknown) =>
        parseChartResult<ChartPointWithLine>(raw),
    }),
    getLowStockAlertsByDay: builder.query<
      ChartPoint[],
      DashboardQuery | undefined
    >({
      query: (arg) => {
        const a = arg as DashboardQuery | undefined;
        const days = a?.days ?? 7;
        return `/dashboard/low-stock-alerts-by-day?days=${days}`;
      },
      transformResponse: (raw: unknown) => parseChartResult<ChartPoint>(raw),
    }),
    getListTopMovements: builder.query<ListItem[], DashboardQuery | undefined>({
      query: (arg) => {
        const a = arg as DashboardQuery | undefined;
        return `/dashboard/list-top-movements?days=${a?.days ?? 30}&limit=${a?.limit ?? 5}`;
      },
      transformResponse: (raw: unknown) => parseChartResult<ListItem>(raw),
    }),
    getListLowStock: builder.query<ListItem[], DashboardQuery | undefined>({
      query: (arg) => {
        const a = arg as DashboardQuery | undefined;
        return `/dashboard/list-low-stock?limit=${a?.limit ?? 5}`;
      },
      transformResponse: (raw: unknown) => parseChartResult<ListItem>(raw),
    }),
    getListLatestMovements: builder.query<
      ListItem[],
      DashboardQuery | undefined
    >({
      query: (arg) => {
        const a = arg as DashboardQuery | undefined;
        return `/dashboard/list-latest-movements?limit=${a?.limit ?? 5}`;
      },
      transformResponse: (raw: unknown) => parseChartResult<ListItem>(raw),
    }),
    getListValueByLocation: builder.query<
      ListItem[],
      DashboardQuery | undefined
    >({
      query: (arg) => {
        const a = arg as DashboardQuery | undefined;
        return `/dashboard/list-value-by-location?limit=${a?.limit ?? 5}`;
      },
      transformResponse: (raw: unknown) => parseChartResult<ListItem>(raw),
    }),
    getListRecentProducts: builder.query<
      ListItem[],
      DashboardQuery | undefined
    >({
      query: (arg) => {
        const a = arg as DashboardQuery | undefined;
        return `/dashboard/list-recent-products?limit=${a?.limit ?? 5}&days=${a?.days ?? 30}`;
      },
      transformResponse: (raw: unknown) => parseChartResult<ListItem>(raw),
    }),
    /** Heatmap de actividad: movimientos por día de la semana y hora (0=Lun, 0–23h). */
    getActivityHeatmap: builder.query<
      ActivityHeatmapCell[],
      DashboardQuery | undefined
    >({
      query: (arg) => {
        const a = arg as DashboardQuery | undefined;
        const days = a?.days ?? 14;
        return `/dashboard/activity-heatmap?days=${days}`;
      },
      transformResponse: (raw: unknown) =>
        parseChartResult<ActivityHeatmapCell>(raw),
    }),

    getGrossSalesProfitKpi: builder.query<
      GrossSalesProfitKpiResult,
      DashboardKpiPeriod
    >({
      query: (period) =>
        `/dashboard/kpi/gross-sales-profit?period=${encodeURIComponent(period)}`,
      transformResponse: (raw: unknown) =>
        unwrapKpi<GrossSalesProfitKpiResult>(raw, "gross-sales-profit"),
      providesTags: [{ type: "DashboardStats", id: "KPI_GROSS" }],
    }),

    getNetSalesProfitKpi: builder.query<
      NetSalesProfitKpiResult,
      DashboardKpiPeriod
    >({
      query: (period) =>
        `/dashboard/kpi/net-sales-profit?period=${encodeURIComponent(period)}`,
      transformResponse: (raw: unknown) =>
        unwrapKpi<NetSalesProfitKpiResult>(raw, "net-sales-profit"),
      providesTags: [{ type: "DashboardStats", id: "KPI_NET" }],
    }),
  }),
});

export const {
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
  useGetActivityHeatmapQuery,
  useGetGrossSalesProfitKpiQuery,
  useGetNetSalesProfitKpiQuery,
} = dashboardApi;
