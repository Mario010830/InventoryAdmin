import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getApiUrl, getToken } from "@/lib/auth-api";
import { parsePaginated, parseChartResult, parseSummaryResult } from "@/lib/api-utils";
import type {
  InventoryMovementResponse,
  CreateInventoryMovementRequest,
  PaginationInfo,
} from "@/lib/dashboard-types";

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationInfo | null;
}

interface GetMovementsArgs {
  page?: number;
  perPage?: number;
  sortOrder?: "asc" | "desc";
}


export interface MovementFormContext {
  locationId: number | null;
  locationName: string | null;
  isLocationLocked: boolean;
}

export const movementsApi = createApi({
  reducerPath: "movementsApi",
  baseQuery: fetchBaseQuery({
    baseUrl: getApiUrl(),
    prepareHeaders: (headers) => {
      const token = getToken();
      if (token) headers.set("Authorization", "Bearer " + token);
      headers.set("Content-Type", "application/json");
      headers.set("ngrok-skip-browser-warning", "true");
      return headers;
    },
  }),
  refetchOnMountOrArgChange: true,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  tagTypes: ["InventoryMovement", "Inventory"],
  endpoints: (builder) => ({
    getMovements: builder.query<PaginatedResult<InventoryMovementResponse>, GetMovementsArgs>({
      query: (arg) => {
        const page = arg?.page ?? 1;
        const perPage = arg?.perPage ?? 10;
        const sortOrder = arg?.sortOrder ?? "desc";
        return "/inventory-movement?page=" + page + "&perPage=" + perPage + "&sortOrder=" + sortOrder;
      },
      transformResponse: (raw: unknown, _meta, arg) =>
        parsePaginated<InventoryMovementResponse>(raw, arg?.perPage ?? 10),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: "InventoryMovement" as const, id })),
              { type: "InventoryMovement", id: "LIST" },
            ]
          : [{ type: "InventoryMovement", id: "LIST" }],
    }),
    getMovementFormContext: builder.query<MovementFormContext, void>({
      query: () => "/inventory-movement/form-context",
      transformResponse: (raw: MovementFormContext | { result?: MovementFormContext }) =>
        (raw && typeof raw === "object" && "result" in raw ? raw.result : raw) as MovementFormContext,
    }),
    createMovement: builder.mutation<InventoryMovementResponse, CreateInventoryMovementRequest>({
      query: (body) => ({ url: "/inventory-movement", method: "POST", body }),
      transformResponse: (raw: InventoryMovementResponse | { data: InventoryMovementResponse }) =>
        "data" in raw ? raw.data : raw,
      invalidatesTags: [
        { type: "InventoryMovement", id: "LIST" },
        { type: "Inventory", id: "LIST" },
      ],
    }),
    getMovementStats: builder.query<Record<string, unknown> | null, { from?: string; to?: string; today?: boolean } | void>({
      query: (arg) => {
        const params = new URLSearchParams();
        if (arg?.from) params.set("from", arg.from);
        if (arg?.to) params.set("to", arg.to);
        if (arg?.today != null) params.set("today", String(arg.today));
        const q = params.toString();
        return `/inventory-movement/stats${q ? `?${q}` : ""}`;
      },
      transformResponse: parseSummaryResult<Record<string, unknown>>,
    }),
    getFlowWithCumulative: builder.query<{ label: string; value: number; lineValue?: number }[], { days?: number } | void>({
      query: (arg) => `/inventory-movement/flow-with-cumulative?days=${(arg as { days?: number })?.days ?? 7}`,
      transformResponse: (raw: unknown) => parseChartResult<{ label: string; value: number; lineValue?: number }>(raw),
    }),
    getDistributionByType: builder.query<{ name: string; value: number }[], void>({
      query: () => "/inventory-movement/distribution-by-type",
      transformResponse: (raw: unknown) => parseChartResult<{ name: string; value: number }>(raw),
    }),
  }),
});

export const {
  useGetMovementsQuery,
  useGetMovementFormContextQuery,
  useCreateMovementMutation,
  useGetMovementStatsQuery,
  useGetFlowWithCumulativeQuery,
  useGetDistributionByTypeQuery,
} = movementsApi;
