import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getApiUrl, getToken } from "@/lib/auth-api";
import { parsePaginated, parseChartResult, parseSummaryResult } from "@/lib/api-utils";
import type {
  ProductCategoryResponse,
  CreateProductCategoryRequest,
  UpdateProductCategoryRequest,
  PaginationInfo,
} from "@/lib/dashboard-types";

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationInfo | null;
}

interface GetCategoriesArgs {
  page?: number;
  perPage?: number;
}

interface UpdateCategoryArgs {
  id: number;
  body: UpdateProductCategoryRequest;
}

export const categoriesApi = createApi({
  reducerPath: "categoriesApi",
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
  tagTypes: ["ProductCategory"],
  endpoints: (builder) => ({
    getCategories: builder.query<PaginatedResult<ProductCategoryResponse>, GetCategoriesArgs>({
      query: (arg) => {
        const page = arg?.page ?? 1;
        const perPage = arg?.perPage ?? 100;
        return "/product-category?page=" + page + "&perPage=" + perPage;
      },
      transformResponse: (raw: unknown, _meta, arg) =>
        parsePaginated<ProductCategoryResponse>(raw, arg?.perPage ?? 100),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: "ProductCategory" as const, id })),
              { type: "ProductCategory", id: "LIST" },
            ]
          : [{ type: "ProductCategory", id: "LIST" }],
    }),
    createCategory: builder.mutation<ProductCategoryResponse, CreateProductCategoryRequest>({
      query: (body) => ({ url: "/product-category", method: "POST", body }),
      transformResponse: (raw: ProductCategoryResponse | { data: ProductCategoryResponse }) =>
        "data" in raw ? raw.data : raw,
      invalidatesTags: [{ type: "ProductCategory", id: "LIST" }],
    }),
    updateCategory: builder.mutation<void, UpdateCategoryArgs>({
      query: ({ id, body }) => ({ url: "/product-category?id=" + id, method: "PUT", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "ProductCategory", id }, { type: "ProductCategory", id: "LIST" }],
    }),
    deleteCategory: builder.mutation<void, number>({
      query: (id) => ({ url: "/product-category?id=" + id, method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [{ type: "ProductCategory", id }, { type: "ProductCategory", id: "LIST" }],
    }),
    getCategoryStats: builder.query<Record<string, unknown> | null, void>({
      query: () => "/product-category/stats",
      transformResponse: parseSummaryResult<Record<string, unknown>>,
    }),
    getItemDistribution: builder.query<{ label: string; value: number }[], { period?: string; days?: number } | void>({
      query: (arg) => {
        const params = new URLSearchParams();
        if (arg?.period) params.set("period", arg.period);
        if (arg?.days != null) params.set("days", String(arg.days));
        const q = params.toString();
        return `/product-category/item-distribution${q ? `?${q}` : ""}`;
      },
      transformResponse: (raw: unknown) => parseChartResult<{ label: string; value: number }>(raw),
    }),
    getStorageUsage: builder.query<{ name: string; value: number }[], void>({
      query: () => "/product-category/storage-usage",
      transformResponse: (raw: unknown) => parseChartResult<{ name: string; value: number }>(raw),
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useGetCategoryStatsQuery,
  useGetItemDistributionQuery,
  useGetStorageUsageQuery,
} = categoriesApi;
