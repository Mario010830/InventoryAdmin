import { createApi } from "@reduxjs/toolkit/query/react";
import baseQueryWithReauth from "@/lib/baseQuery";
import type {
  CashOutflowResponseDto,
  CreateCashOutflowRequest,
} from "@/lib/dashboard-types";

function extractCashOutflow(raw: unknown): CashOutflowResponseDto {
  if (raw == null || typeof raw !== "object") {
    return raw as CashOutflowResponseDto;
  }
  const obj = raw as Record<string, unknown>;
  const inner =
    (obj.result ?? obj.Result ?? obj.data ?? obj.Data ?? raw) as unknown;
  if (inner && typeof inner === "object" && !Array.isArray(inner)) {
    return inner as CashOutflowResponseDto;
  }
  return raw as CashOutflowResponseDto;
}

function extractCashOutflowList(raw: unknown): CashOutflowResponseDto[] {
  if (Array.isArray(raw)) return raw as CashOutflowResponseDto[];
  const obj = raw as Record<string, unknown> | null;
  if (!obj) return [];
  const inner = obj.result ?? obj.Result ?? obj.data ?? obj.Data;
  if (Array.isArray(inner)) return inner as CashOutflowResponseDto[];
  return [];
}

function dateKey(d: string): string {
  return d.trim().slice(0, 10);
}

function dayTagId(date: string, locationId: number | undefined) {
  return `DAY_${dateKey(date)}_${locationId ?? 0}`;
}

export const cashOutflowApi = createApi({
  reducerPath: "cashOutflowApi",
  baseQuery: baseQueryWithReauth,
  refetchOnMountOrArgChange: true,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  tagTypes: ["CashOutflow"],
  endpoints: (builder) => ({
    getCashOutflows: builder.query<
      CashOutflowResponseDto[],
      { date: string; locationId?: number }
    >({
      query: ({ date, locationId }) => {
        const p = new URLSearchParams();
        p.set("date", date);
        if (locationId != null && locationId > 0) {
          p.set("locationId", String(locationId));
        }
        return `/cash-outflow?${p.toString()}`;
      },
      transformResponse: (raw: unknown) => extractCashOutflowList(raw),
      providesTags: (_r, _e, arg) => [
        { type: "CashOutflow", id: dayTagId(arg.date, arg.locationId) },
      ],
    }),

    createCashOutflow: builder.mutation<
      CashOutflowResponseDto,
      CreateCashOutflowRequest
    >({
      query: (body) => ({ url: "/cash-outflow", method: "POST", body }),
      transformResponse: extractCashOutflow,
      invalidatesTags: (_r, _e, arg) => [
        { type: "CashOutflow", id: dayTagId(arg.date, arg.locationId ?? undefined) },
      ],
    }),

    deleteCashOutflow: builder.mutation<
      void,
      { id: number; date: string; locationId?: number }
    >({
      query: ({ id }) => ({ url: `/cash-outflow?id=${id}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "CashOutflow", id: dayTagId(arg.date, arg.locationId) },
      ],
    }),
  }),
});

export const {
  useGetCashOutflowsQuery,
  useCreateCashOutflowMutation,
  useDeleteCashOutflowMutation,
} = cashOutflowApi;
