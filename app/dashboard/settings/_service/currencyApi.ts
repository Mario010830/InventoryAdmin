import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { parseChartResult, parseSummaryResult } from "@/lib/api-utils";
import { getApiUrl, getToken } from "@/lib/auth-api";
import type {
  CreateCurrencyDenominationRequest,
  CreateCurrencyRequest,
  CurrencyDenominationResponse,
  CurrencyResponse,
  SetDefaultCurrencyRequest,
  UpdateCurrencyDenominationRequest,
  UpdateCurrencyRequest,
} from "@/lib/dashboard-types";

function unwrapCurrency(raw: unknown): CurrencyResponse {
  const v = parseSummaryResult<CurrencyResponse>(raw);
  if (v && typeof (v as CurrencyResponse).id === "number") return v;
  throw new Error("Respuesta de moneda inválida");
}

function unwrapDenomination(raw: unknown): CurrencyDenominationResponse {
  const v = parseSummaryResult<CurrencyDenominationResponse>(raw);
  if (v && typeof (v as CurrencyDenominationResponse).id === "number") return v;
  throw new Error("Respuesta de denominación inválida");
}

/** Lista GET /currency: tolera envoltorios ApiResponse y variantes. */
function parseCurrencyList(raw: unknown): CurrencyResponse[] {
  const parsed = parseChartResult<CurrencyResponse>(raw);
  if (parsed.length > 0) return parsed;
  const o = raw as Record<string, unknown> | null;
  if (!o) return [];
  const direct = o.result ?? o.Result ?? o.data ?? o.Data;
  if (Array.isArray(direct)) return direct as CurrencyResponse[];
  if (direct && typeof direct === "object") {
    const inner = direct as Record<string, unknown>;
    for (const key of [
      "data",
      "Data",
      "items",
      "Items",
      "value",
      "Value",
      "currencies",
    ]) {
      const v = inner[key];
      if (Array.isArray(v)) return v as CurrencyResponse[];
    }
  }
  return [];
}

export const currencyApi = createApi({
  reducerPath: "currencyApi",
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
  refetchOnFocus: false,
  refetchOnReconnect: true,
  tagTypes: ["Currency", "CurrencyDenomination"],
  endpoints: (builder) => ({
    getCurrencies: builder.query<CurrencyResponse[], void>({
      query: () => "/currency",
      transformResponse: (raw: unknown) => parseCurrencyList(raw),
      providesTags: (result) =>
        result?.length
          ? [
              ...result.map(({ id }) => ({ type: "Currency" as const, id })),
              { type: "Currency", id: "LIST" },
            ]
          : [{ type: "Currency", id: "LIST" }],
    }),
    getCurrencyById: builder.query<CurrencyResponse, number>({
      query: (id) => `/currency/${id}`,
      transformResponse: unwrapCurrency,
      providesTags: (_r, _e, id) => [{ type: "Currency", id }],
    }),
    createCurrency: builder.mutation<CurrencyResponse, CreateCurrencyRequest>({
      query: (body) => ({ url: "/currency", method: "POST", body }),
      transformResponse: unwrapCurrency,
      invalidatesTags: [{ type: "Currency", id: "LIST" }],
    }),
    updateCurrency: builder.mutation<
      CurrencyResponse,
      { id: number; body: UpdateCurrencyRequest }
    >({
      query: ({ id, body }) => ({
        url: `/currency/${id}`,
        method: "PUT",
        body,
      }),
      transformResponse: unwrapCurrency,
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Currency", id },
        { type: "Currency", id: "LIST" },
      ],
    }),
    deleteCurrency: builder.mutation<void, number>({
      query: (id) => ({ url: `/currency/${id}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Currency", id },
        { type: "Currency", id: "LIST" },
      ],
    }),
    setDefaultDisplayCurrency: builder.mutation<
      CurrencyResponse,
      SetDefaultCurrencyRequest
    >({
      query: (body) => ({ url: "/currency/default", method: "PUT", body }),
      transformResponse: unwrapCurrency,
      invalidatesTags: [{ type: "Currency", id: "LIST" }],
    }),

    getDenominations: builder.query<
      CurrencyDenominationResponse[],
      { currencyId: number; activeOnly?: boolean }
    >({
      query: ({ currencyId, activeOnly }) => {
        const p = new URLSearchParams();
        if (activeOnly === true) p.set("activeOnly", "true");
        const q = p.toString();
        return `/currency/${currencyId}/denominations${q ? `?${q}` : ""}`;
      },
      transformResponse: (raw: unknown) =>
        parseChartResult<CurrencyDenominationResponse>(raw),
      providesTags: (_r, _e, arg) => [
        { type: "CurrencyDenomination" as const, id: arg.currencyId },
      ],
    }),

    createDenomination: builder.mutation<
      CurrencyDenominationResponse,
      { currencyId: number; body: CreateCurrencyDenominationRequest }
    >({
      query: ({ currencyId, body }) => ({
        url: `/currency/${currencyId}/denominations`,
        method: "POST",
        body,
      }),
      transformResponse: unwrapDenomination,
      invalidatesTags: (_r, _e, arg) => [
        { type: "CurrencyDenomination", id: arg.currencyId },
      ],
    }),

    updateDenomination: builder.mutation<
      CurrencyDenominationResponse,
      {
        currencyId: number;
        id: number;
        body: UpdateCurrencyDenominationRequest;
      }
    >({
      query: ({ currencyId, id, body }) => ({
        url: `/currency/${currencyId}/denominations/${id}`,
        method: "PUT",
        body,
      }),
      transformResponse: unwrapDenomination,
      invalidatesTags: (_r, _e, arg) => [
        { type: "CurrencyDenomination", id: arg.currencyId },
      ],
    }),

    deleteDenomination: builder.mutation<
      void,
      { currencyId: number; id: number }
    >({
      query: ({ currencyId, id }) => ({
        url: `/currency/${currencyId}/denominations/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "CurrencyDenomination", id: arg.currencyId },
      ],
    }),
  }),
});

export const {
  useGetCurrenciesQuery,
  useGetCurrencyByIdQuery,
  useCreateCurrencyMutation,
  useUpdateCurrencyMutation,
  useDeleteCurrencyMutation,
  useSetDefaultDisplayCurrencyMutation,
  useGetDenominationsQuery,
  useCreateDenominationMutation,
  useUpdateDenominationMutation,
  useDeleteDenominationMutation,
} = currencyApi;
