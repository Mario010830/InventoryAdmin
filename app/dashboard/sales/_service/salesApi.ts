import { createApi } from "@reduxjs/toolkit/query/react";
import baseQueryWithReauth from "@/lib/baseQuery";
import { parsePaginated, parseSummaryResult } from "@/lib/api-utils";
import type { PaginatedResult } from "@/lib/api-utils";
import type {
  SaleOrderResponse,
  CreateSaleOrderRequest,
  UpdateSaleOrderRequest,
} from "@/lib/dashboard-types";

interface GetOrdersArgs {
  page?: number;
  perPage?: number;
  status?: string;
  sortOrder?: string;
}

function extractOrder(raw: unknown): SaleOrderResponse {
  const obj = raw as Record<string, unknown>;
  return (obj?.result ?? raw) as SaleOrderResponse;
}

export const salesApi = createApi({
  reducerPath: "salesApi",
  baseQuery: baseQueryWithReauth,
  refetchOnMountOrArgChange: true,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  tagTypes: ["SaleOrder"],

  endpoints: (builder) => ({
    getOrders: builder.query<PaginatedResult<SaleOrderResponse>, GetOrdersArgs>({
      query: ({ page = 1, perPage = 10, status = "", sortOrder = "desc" } = {}) => {
        const p = new URLSearchParams();
        p.set("page", String(page));
        p.set("perPage", String(perPage));
        if (status) p.set("status", status);
        if (sortOrder) p.set("sortOrder", sortOrder);
        return `/sale-order?${p.toString()}`;
      },
      transformResponse: (raw: unknown, _meta, arg) =>
        parsePaginated<SaleOrderResponse>(raw, arg.perPage ?? 10),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: "SaleOrder" as const, id })),
              { type: "SaleOrder", id: "LIST" },
            ]
          : [{ type: "SaleOrder", id: "LIST" }],
    }),

    getOrderById: builder.query<SaleOrderResponse, number>({
      query: (id) => `/sale-order/id?id=${id}`,
      transformResponse: extractOrder,
      providesTags: (_r, _e, id) => [{ type: "SaleOrder", id }],
    }),

    createOrder: builder.mutation<SaleOrderResponse, CreateSaleOrderRequest>({
      query: (body) => ({ url: "/sale-order", method: "POST", body }),
      transformResponse: extractOrder,
      invalidatesTags: [{ type: "SaleOrder", id: "LIST" }],
    }),

    updateOrder: builder.mutation<void, { id: number; body: UpdateSaleOrderRequest }>({
      query: ({ id, body }) => ({ url: `/sale-order?id=${id}`, method: "PUT", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "SaleOrder", id },
        { type: "SaleOrder", id: "LIST" },
      ],
    }),

    confirmOrder: builder.mutation<SaleOrderResponse, number>({
      query: (id) => ({ url: `/sale-order/${id}/confirm`, method: "POST" }),
      transformResponse: extractOrder,
      invalidatesTags: (_r, _e, id) => [
        { type: "SaleOrder", id },
        { type: "SaleOrder", id: "LIST" },
      ],
    }),

    cancelOrder: builder.mutation<SaleOrderResponse, number>({
      query: (id) => ({ url: `/sale-order/${id}/cancel`, method: "POST" }),
      transformResponse: extractOrder,
      invalidatesTags: (_r, _e, id) => [
        { type: "SaleOrder", id },
        { type: "SaleOrder", id: "LIST" },
      ],
    }),

    getOrderStats: builder.query<Record<string, unknown> | null, number | void>({
      query: (days = 30) => `/sale-order/stats?days=${days}`,
      transformResponse: parseSummaryResult<Record<string, unknown>>,
    }),
  }),
});

export const {
  useGetOrdersQuery,
  useGetOrderByIdQuery,
  useCreateOrderMutation,
  useUpdateOrderMutation,
  useConfirmOrderMutation,
  useCancelOrderMutation,
  useGetOrderStatsQuery,
} = salesApi;
