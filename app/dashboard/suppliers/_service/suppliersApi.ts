import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getApiUrl, getToken } from "@/lib/auth-api";
import { parsePaginated, parseChartResult, parseSummaryResult } from "@/lib/api-utils";
import type {
  SupplierResponse,
  CreateSupplierRequest,
  UpdateSupplierRequest,
  PaginationInfo,
} from "@/lib/dashboard-types";

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationInfo | null;
}

interface GetSuppliersArgs {
  page?: number;
  perPage?: number;
  sortOrder?: "asc" | "desc";
}

interface UpdateSupplierArgs {
  id: number;
  body: UpdateSupplierRequest;
}

export const suppliersApi = createApi({
  reducerPath: "suppliersApi",
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
  tagTypes: ["Supplier"],
  endpoints: (builder) => ({
    getSuppliers: builder.query<PaginatedResult<SupplierResponse>, GetSuppliersArgs>({
      query: (arg) => {
        const page = arg?.page ?? 1;
        const perPage = arg?.perPage ?? 10;
        const sortOrder = arg?.sortOrder ?? "desc";
        return "/supplier?page=" + page + "&perPage=" + perPage + "&sortOrder=" + sortOrder;
      },
      transformResponse: (raw: unknown, _meta, arg) =>
        parsePaginated<SupplierResponse>(raw, arg?.perPage ?? 10),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: "Supplier" as const, id })),
              { type: "Supplier", id: "LIST" },
            ]
          : [{ type: "Supplier", id: "LIST" }],
    }),
    createSupplier: builder.mutation<SupplierResponse, CreateSupplierRequest>({
      query: (body) => ({ url: "/supplier", method: "POST", body }),
      transformResponse: (raw: SupplierResponse | { data: SupplierResponse }) =>
        "data" in raw ? raw.data : raw,
      invalidatesTags: [{ type: "Supplier", id: "LIST" }],
    }),
    updateSupplier: builder.mutation<void, UpdateSupplierArgs>({
      query: ({ id, body }) => ({ url: "/supplier?id=" + id, method: "PUT", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Supplier", id }, { type: "Supplier", id: "LIST" }],
    }),
    deleteSupplier: builder.mutation<void, number>({
      query: (id) => ({ url: "/supplier?id=" + id, method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [{ type: "Supplier", id }, { type: "Supplier", id: "LIST" }],
    }),
    getSupplierStats: builder.query<Record<string, unknown> | null, { from?: string; to?: string } | void>({
      query: (arg) => {
        const params = new URLSearchParams();
        if (arg?.from) params.set("from", arg.from);
        if (arg?.to) params.set("to", arg.to);
        const q = params.toString();
        return `/supplier/stats${q ? `?${q}` : ""}`;
      },
      transformResponse: parseSummaryResult<Record<string, unknown>>,
    }),
    getDeliveryTimeline: builder.query<{ label: string; value: number }[], { days?: number; from?: string; to?: string } | void>({
      query: (arg) => {
        const params = new URLSearchParams();
        if (arg?.days != null) params.set("days", String(arg.days));
        if (arg?.from) params.set("from", arg.from);
        if (arg?.to) params.set("to", arg.to);
        const q = params.toString();
        return `/supplier/delivery-timeline${q ? `?${q}` : ""}`;
      },
      transformResponse: (raw: unknown) => parseChartResult<{ label: string; value: number }>(raw),
    }),
    getSupplierCategoryDistribution: builder.query<{ name: string; value: number }[], void>({
      query: () => "/supplier/category-distribution",
      transformResponse: (raw: unknown) => parseChartResult<{ name: string; value: number }>(raw),
    }),
  }),
});

export const {
  useGetSuppliersQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
  useGetSupplierStatsQuery,
  useGetDeliveryTimelineQuery,
  useGetSupplierCategoryDistributionQuery,
} = suppliersApi;
