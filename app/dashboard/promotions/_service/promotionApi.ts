import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getApiUrl, getToken } from "@/lib/auth-api";
import { parsePaginated, type PaginatedResult } from "@/lib/api-utils";

export type PromotionType = "percentage" | "fixed";

export interface PromotionResponse {
  id: number;
  productId: number;
  productName?: string;
  productCode?: string;
  promotionType: PromotionType;
  value: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  minQuantity: number;
  isCurrentlyValid: boolean;
}

export interface CreatePromotionRequest {
  productId: number;
  type: PromotionType;
  value: number;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
  minQuantity: number;
}

export type UpdatePromotionRequest = Partial<{
  type: PromotionType;
  value: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  minQuantity: number;
}>;

function normalizePromotionType(raw: string): PromotionType {
  const t = raw.trim().toLowerCase();
  if (t === "fixed" || t === "amount") return "fixed";
  return "percentage";
}

function parsePromotionRow(row: Record<string, unknown>): PromotionResponse | null {
  const id = Number(row.id ?? row.Id);
  if (!Number.isFinite(id)) return null;

  let productId = Number(row.productId ?? row.ProductId ?? 0);
  let productName: string | undefined;
  let productCode: string | undefined;
  const prod = row.product ?? row.Product;
  if (prod && typeof prod === "object" && !Array.isArray(prod)) {
    const p = prod as Record<string, unknown>;
    if (!Number.isFinite(productId) || productId === 0) {
      productId = Number(p.id ?? p.Id ?? 0);
    }
    const n = p.name ?? p.Name;
    if (typeof n === "string" && n.trim()) productName = n.trim();
    const c = p.code ?? p.Code;
    if (typeof c === "string" && c.trim()) productCode = c.trim();
  }

  const promotionType = normalizePromotionType(
    String(row.promotionType ?? row.PromotionType ?? row.type ?? row.Type ?? "percentage"),
  );

  const startsRaw = row.startsAt ?? row.StartsAt;
  const endsRaw = row.endsAt ?? row.EndsAt;
  const startsAt =
    startsRaw == null || startsRaw === "" ? null : String(startsRaw);
  const endsAt = endsRaw == null || endsRaw === "" ? null : String(endsRaw);

  const isActive = Boolean(row.isActive ?? row.IsActive ?? false);
  const minQuantity = Math.max(1, Number(row.minQuantity ?? row.MinQuantity ?? 1));
  const value = Number(row.value ?? row.Value ?? 0);
  const isCurrentlyValid = Boolean(
    row.isCurrentlyValid ?? row.IsCurrentlyValid ?? false,
  );

  if (!productName) {
    const pn = row.productName ?? row.ProductName;
    if (typeof pn === "string" && pn.trim()) productName = pn.trim();
  }

  return {
    id,
    productId: Number.isFinite(productId) ? productId : 0,
    productName,
    productCode,
    promotionType,
    value: Number.isFinite(value) ? value : 0,
    startsAt,
    endsAt,
    isActive,
    minQuantity,
    isCurrentlyValid,
  };
}

interface GetPromotionsArgs {
  page?: number;
  perPage?: number;
  productId?: number;
  activeOnly?: boolean;
}

interface UpdatePromotionArgs {
  id: number;
  body: UpdatePromotionRequest;
}

export const promotionApi = createApi({
  reducerPath: "promotionApi",
  baseQuery: fetchBaseQuery({
    baseUrl: getApiUrl(),
    prepareHeaders: (headers) => {
      const token = getToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      headers.set("Content-Type", "application/json");
      headers.set("ngrok-skip-browser-warning", "true");
    },
  }),
  refetchOnMountOrArgChange: true,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  tagTypes: ["Promotion"],
  endpoints: (builder) => ({
    getPromotions: builder.query<PaginatedResult<PromotionResponse>, GetPromotionsArgs>({
      query: (arg) => {
        const page = arg?.page ?? 1;
        const perPage = arg?.perPage ?? 10;
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("perPage", String(perPage));
        const pid = arg?.productId;
        if (pid != null && pid > 0) params.set("productId", String(pid));
        if (arg?.activeOnly === true) params.set("activeOnly", "true");
        if (arg?.activeOnly === false) params.set("activeOnly", "false");
        return `/promotion?${params.toString()}`;
      },
      transformResponse: (raw: unknown, _meta, arg) => {
        const { data, pagination } = parsePaginated<Record<string, unknown>>(
          raw,
          arg?.perPage ?? 10,
        );
        const rows = data
          .map((r) => parsePromotionRow(r))
          .filter((r): r is PromotionResponse => r != null);
        return { data: rows, pagination };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((row) => ({
                type: "Promotion" as const,
                id: row.id,
              })),
              { type: "Promotion", id: "LIST" },
            ]
          : [{ type: "Promotion", id: "LIST" }],
    }),

    createPromotion: builder.mutation<void, CreatePromotionRequest>({
      query: (body) => ({ url: "/promotion", method: "POST", body }),
      invalidatesTags: [{ type: "Promotion", id: "LIST" }],
    }),

    updatePromotion: builder.mutation<void, UpdatePromotionArgs>({
      query: ({ id, body }) => ({
        url: `/promotion?id=${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_r, _e, arg: UpdatePromotionArgs) => [
        { type: "Promotion", id: arg.id },
        { type: "Promotion", id: "LIST" },
      ],
    }),

    setPromotionActive: builder.mutation<void, { id: number; isActive: boolean }>({
      query: ({ id, isActive }) => ({
        url: `/promotion/${id}/active?isActive=${isActive ? "true" : "false"}`,
        method: "PATCH",
      }),
      invalidatesTags: (_r, _e, arg: { id: number; isActive: boolean }) => [
        { type: "Promotion", id: arg.id },
        { type: "Promotion", id: "LIST" },
      ],
    }),

    deletePromotion: builder.mutation<void, number>({
      query: (id) => ({
        url: `/promotion?id=${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Promotion", id },
        { type: "Promotion", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetPromotionsQuery,
  useCreatePromotionMutation,
  useUpdatePromotionMutation,
  useSetPromotionActiveMutation,
  useDeletePromotionMutation,
} = promotionApi;
