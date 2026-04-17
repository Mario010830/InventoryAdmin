import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { parsePaginated, parseSummaryResult } from "@/lib/api-utils";
import { getApiUrl, getToken } from "@/lib/auth-api";
import type {
  CreatePaymentMethodRequest,
  PaginationInfo,
  PaymentMethodResponse,
  UpdatePaymentMethodRequest,
} from "@/lib/dashboard-types";

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationInfo | null;
}

interface GetPaymentMethodsArgs {
  page?: number;
  perPage?: number;
}

interface UpdatePaymentMethodArgs {
  id: number;
  body: UpdatePaymentMethodRequest;
}

export const paymentMethodsApi = createApi({
  reducerPath: "paymentMethodsApi",
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
  tagTypes: ["PaymentMethod"],
  endpoints: (builder) => ({
    getPaymentMethods: builder.query<
      PaginatedResult<PaymentMethodResponse>,
      GetPaymentMethodsArgs
    >({
      query: (arg) => {
        const page = arg?.page ?? 1;
        const perPage = arg?.perPage ?? 10;
        return `/payment-method?page=${page}&perPage=${perPage}`;
      },
      transformResponse: (raw: unknown, _meta, arg) =>
        parsePaginated<PaymentMethodResponse>(raw, arg?.perPage ?? 10),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({
                type: "PaymentMethod" as const,
                id,
              })),
              { type: "PaymentMethod", id: "LIST" },
            ]
          : [{ type: "PaymentMethod", id: "LIST" }],
    }),
    getPaymentMethodById: builder.query<PaymentMethodResponse, number>({
      query: (id) => `/payment-method/id?id=${id}`,
      transformResponse: (raw: unknown) => {
        const row = parseSummaryResult<PaymentMethodResponse>(raw);
        if (!row) {
          throw new Error("Respuesta inválida del servidor.");
        }
        return row;
      },
      providesTags: (_r, _e, id) => [{ type: "PaymentMethod", id }],
    }),
    createPaymentMethod: builder.mutation<
      PaymentMethodResponse,
      CreatePaymentMethodRequest
    >({
      query: (body) => ({ url: "/payment-method", method: "POST", body }),
      transformResponse: (raw: unknown) => {
        const row = parseSummaryResult<PaymentMethodResponse>(raw);
        if (!row) {
          throw new Error("Respuesta inválida del servidor.");
        }
        return row;
      },
      invalidatesTags: [{ type: "PaymentMethod", id: "LIST" }],
    }),
    updatePaymentMethod: builder.mutation<void, UpdatePaymentMethodArgs>({
      query: ({ id, body }) => ({
        url: `/payment-method?id=${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "PaymentMethod", id },
        { type: "PaymentMethod", id: "LIST" },
      ],
    }),
    deletePaymentMethod: builder.mutation<void, number>({
      query: (id) => ({ url: `/payment-method?id=${id}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "PaymentMethod", id },
        { type: "PaymentMethod", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetPaymentMethodsQuery,
  useGetPaymentMethodByIdQuery,
  useCreatePaymentMethodMutation,
  useUpdatePaymentMethodMutation,
  useDeletePaymentMethodMutation,
} = paymentMethodsApi;
