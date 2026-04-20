import { createApi } from "@reduxjs/toolkit/query/react";
import { contactsApi } from "@/app/dashboard/contacts/_service/contactsApi";
import type { PaginatedResult } from "@/lib/api-utils";
import { parsePaginated, parseSummaryResult } from "@/lib/api-utils";
import baseQueryWithReauth from "@/lib/baseQuery";
import type {
  CreateSaleOrderRequest,
  CreateSaleReturnRequest,
  SaleOrderResponse,
  SaleReturnResponse,
  UpdateSaleOrderRequest,
} from "@/lib/dashboard-types";

interface GetOrdersArgs {
  page?: number;
  perPage?: number;
  status?: string;
  sortOrder?: string;
}

function extractOrder(raw: unknown): SaleOrderResponse {
  if (raw == null || typeof raw !== "object") {
    return raw as SaleOrderResponse;
  }
  const obj = raw as Record<string, unknown>;
  const inner =
    (obj.result ?? obj.Result ?? obj.data ?? obj.Data ?? raw) as unknown;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    return inner as SaleOrderResponse;
  }
  return raw as SaleOrderResponse;
}

function extractSaleReturn(raw: unknown): SaleReturnResponse {
  if (raw == null || typeof raw !== "object") {
    return raw as SaleReturnResponse;
  }
  const obj = raw as Record<string, unknown>;
  const inner =
    (obj.result ?? obj.Result ?? obj.data ?? obj.Data ?? raw) as unknown;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    return inner as SaleReturnResponse;
  }
  return raw as SaleReturnResponse;
}

interface GetSaleReturnsArgs {
  page?: number;
  perPage?: number;
  sortOrder?: string;
}

interface GetSaleReturnsBySaleOrderArgs {
  saleOrderId: number;
  page?: number;
  perPage?: number;
}

export const salesApi = createApi({
  reducerPath: "salesApi",
  baseQuery: baseQueryWithReauth,
  refetchOnMountOrArgChange: true,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  tagTypes: ["SaleOrder", "SaleReturn"],

  endpoints: (builder) => ({
    getOrders: builder.query<PaginatedResult<SaleOrderResponse>, GetOrdersArgs>(
      {
        query: ({
          page = 1,
          perPage = 10,
          status = "",
          sortOrder = "desc",
        } = {}) => {
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
                ...result.data.map(({ id }) => ({
                  type: "SaleOrder" as const,
                  id,
                })),
                { type: "SaleOrder", id: "LIST" },
              ]
            : [{ type: "SaleOrder", id: "LIST" }],
      },
    ),

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

    updateOrder: builder.mutation<
      void,
      { id: number; body: UpdateSaleOrderRequest }
    >({
      query: ({ id, body }) => ({
        url: `/sale-order?id=${id}`,
        method: "PUT",
        body,
      }),
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
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const cid = data?.contactId;
          if (cid != null && cid > 0) {
            dispatch(
              contactsApi.util.invalidateTags([
                { type: "ContactLoyalty", id: cid },
              ]),
            );
          }
        } catch {
          /* confirmación fallida: no refrescar lealtad */
        }
      },
    }),

    cancelOrder: builder.mutation<SaleOrderResponse, number>({
      query: (id) => ({ url: `/sale-order/${id}/cancel`, method: "POST" }),
      transformResponse: extractOrder,
      invalidatesTags: (_r, _e, id) => [
        { type: "SaleOrder", id },
        { type: "SaleOrder", id: "LIST" },
      ],
    }),

    getOrderStats: builder.query<
      Record<string, unknown> | null,
      number | undefined
    >({
      query: (days = 30) => `/sale-order/stats?days=${days}`,
      transformResponse: parseSummaryResult<Record<string, unknown>>,
    }),

    getSaleReturns: builder.query<
      PaginatedResult<SaleReturnResponse>,
      GetSaleReturnsArgs
    >({
      query: ({
        page = 1,
        perPage = 10,
        sortOrder = "desc",
      }: GetSaleReturnsArgs = {}) => {
        const p = new URLSearchParams();
        p.set("page", String(page));
        p.set("perPage", String(perPage));
        p.set("sortOrder", sortOrder);
        return `/sale-return?${p.toString()}`;
      },
      transformResponse: (raw: unknown, _meta, arg) =>
        parsePaginated<SaleReturnResponse>(raw, arg?.perPage ?? 10),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({
                type: "SaleReturn" as const,
                id,
              })),
              { type: "SaleReturn", id: "LIST" },
            ]
          : [{ type: "SaleReturn", id: "LIST" }],
    }),

    getSaleReturnById: builder.query<SaleReturnResponse, number>({
      query: (id) => `/sale-return/id?id=${id}`,
      transformResponse: extractSaleReturn,
      providesTags: (_r, _e, id) => [{ type: "SaleReturn", id }],
    }),

    getSaleReturnsBySaleOrder: builder.query<
      PaginatedResult<SaleReturnResponse>,
      GetSaleReturnsBySaleOrderArgs
    >({
      query: (arg) => {
        const page = arg.page ?? 1;
        const perPage = arg.perPage ?? 50;
        return `/sale-return/by-sale-order?saleOrderId=${arg.saleOrderId}&page=${page}&perPage=${perPage}`;
      },
      transformResponse: (raw: unknown, _meta, arg) =>
        parsePaginated<SaleReturnResponse>(raw, arg?.perPage ?? 50),
      providesTags: (result, _e, arg) =>
        result
          ? [
              ...result.data.map(({ id }) => ({
                type: "SaleReturn" as const,
                id,
              })),
              { type: "SaleReturn", id: `BY_SALE_${arg.saleOrderId}` },
            ]
          : [{ type: "SaleReturn", id: `BY_SALE_${arg.saleOrderId}` }],
    }),

    createSaleReturn: builder.mutation<
      SaleReturnResponse,
      CreateSaleReturnRequest
    >({
      query: (body) => ({ url: "/sale-return", method: "POST", body }),
      transformResponse: extractSaleReturn,
      invalidatesTags: (_r, _e, arg) => [
        { type: "SaleReturn", id: "LIST" },
        { type: "SaleReturn", id: `BY_SALE_${arg.saleOrderId}` },
        { type: "SaleOrder", id: arg.saleOrderId },
        { type: "SaleOrder", id: "LIST" },
      ],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(contactsApi.util.invalidateTags([{ type: "ContactLoyalty" }]));
        } catch {
          /* devolución fallida */
        }
      },
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
  useGetSaleReturnsQuery,
  useGetSaleReturnByIdQuery,
  useGetSaleReturnsBySaleOrderQuery,
  useCreateSaleReturnMutation,
} = salesApi;
