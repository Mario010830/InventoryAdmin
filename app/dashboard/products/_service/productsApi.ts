import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import {
  type PaginatedResult,
  parseChartResult,
  parsePaginated,
  parseSummaryResult,
} from "@/lib/api-utils";
import { getApiUrl, getToken } from "@/lib/auth-api";
import type {
  CreateProductRequest,
  ProductCategoryResponse,
  ProductImageResponse,
  ProductResponse,
  Tag,
  UpdateProductRequest,
} from "../../../../lib/dashboard-types";

interface GetProductsArgs {
  page?: number;
  perPage?: number;
  sortOrder?: "asc" | "desc";
}

interface GetCategoriesArgs {
  page?: number;
  perPage?: number;
}

interface UpdateProductArgs {
  id: number;
  body: UpdateProductRequest;
}

function normalizeProductImageRow(
  row: Record<string, unknown>,
): ProductImageResponse {
  const id = Number(
    row.id ??
      row.Id ??
      row.productImageId ??
      row.ProductImageId ??
      row.imageId ??
      row.ImageId ??
      0,
  );
  const url = String(
    row.url ??
      row.Url ??
      row.imageUrl ??
      row.ImageUrl ??
      row.imagenUrl ??
      row.ImagenUrl ??
      "",
  );
  return { id, url };
}

/** Extrae `imagenUrl` de respuestas de mutación (envoltorios camelCase / PascalCase). */
export function extractImagenUrlFromUnknown(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  const obj = raw as Record<string, unknown>;
  const nested =
    obj.result ??
    obj.Result ??
    obj.data ??
    obj.Data ??
    obj.product ??
    obj.Product ??
    obj;
  if (typeof nested === "string" && nested.trim()) return nested.trim();
  if (nested && typeof nested === "object") {
    const n = nested as Record<string, unknown>;
    const u =
      n.imagenUrl ??
      n.ImagenUrl ??
      n.imageUrl ??
      n.ImageUrl ??
      n.url ??
      n.Url ??
      n.primaryImageUrl ??
      n.PrimaryImageUrl;
    if (typeof u === "string" && u.trim()) return u.trim();
  }
  return null;
}

function parseOfferLocationIds(
  row: Record<string, unknown>,
): number[] | undefined {
  const raw = row.offerLocationIds ?? row.OfferLocationIds;
  if (!Array.isArray(raw)) return undefined;
  const ids = raw.map((x) => Number(x)).filter((n) => Number.isFinite(n));
  return ids;
}

function parseProductOne(raw: unknown): ProductResponse | null {
  if (Array.isArray(raw)) {
    if (raw.length === 0) return null;
    return parseProductOne(raw[0]);
  }
  const obj = raw as Record<string, unknown> | null;
  if (!obj) return null;
  const inner = (obj.result ??
    obj.Result ??
    obj.data ??
    obj.Data ??
    obj) as unknown;
  const row =
    inner && typeof inner === "object" && !Array.isArray(inner)
      ? (inner as Record<string, unknown>)
      : obj;
  const id = Number(row.id ?? row.Id);
  if (!Number.isFinite(id)) return null;
  return {
    id,
    code: String(row.code ?? row.Code ?? ""),
    name: String(row.name ?? row.Name ?? ""),
    description: String(row.description ?? row.Description ?? ""),
    categoryId: Number(row.categoryId ?? row.CategoryId ?? 0),
    precio: Number(row.precio ?? row.Precio ?? row.price ?? row.Price ?? 0),
    costo: Number(row.costo ?? row.Costo ?? row.cost ?? row.Cost ?? 0),
    imagenUrl: String(row.imagenUrl ?? row.ImagenUrl ?? ""),
    isAvailable: Boolean(row.isAvailable ?? row.IsAvailable ?? true),
    isForSale: Boolean(row.isForSale ?? row.IsForSale ?? false),
    tipo: (row.tipo ?? row.Tipo) as ProductResponse["tipo"],
    tagIds: Array.isArray(row.tagIds ?? row.TagIds)
      ? (row.tagIds as unknown[]).map((x) => Number(x))
      : undefined,
    offerLocationIds: parseOfferLocationIds(row),
    createdAt: String(row.createdAt ?? row.CreatedAt ?? ""),
    modifiedAt: String(row.modifiedAt ?? row.ModifiedAt ?? ""),
    totalStock:
      row.totalStock != null
        ? Number(row.totalStock ?? row.TotalStock)
        : undefined,
  };
}

// ─── API slice ────────────────────────────────────────────────────────────────

export const productsApi = createApi({
  reducerPath: "productsApi",

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

  tagTypes: ["Product", "ProductCategory", "Tag", "ProductImages"],

  endpoints: (builder) => ({
    // GET /product
    getProducts: builder.query<
      PaginatedResult<ProductResponse>,
      GetProductsArgs
    >({
      query: ({ page = 1, perPage = 10, sortOrder = "desc" } = {}) =>
        `/product?page=${page}&perPage=${perPage}&sortOrder=${sortOrder}`,
      transformResponse: (raw: unknown, _meta, arg) =>
        parsePaginated<ProductResponse>(raw, arg.perPage ?? 10),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({
                type: "Product" as const,
                id,
              })),
              { type: "Product", id: "LIST" },
            ]
          : [{ type: "Product", id: "LIST" }],
    }),

    // POST /product
    createProduct: builder.mutation<ProductResponse, CreateProductRequest>({
      query: (body) => ({
        url: "/product",
        method: "POST",
        body,
      }),
      transformResponse: (
        raw:
          | ProductResponse
          | { data?: ProductResponse; result?: ProductResponse },
      ) => {
        const obj = raw as Record<string, unknown>;
        if (
          obj &&
          typeof obj === "object" &&
          (obj.data != null || obj.result != null)
        ) {
          return (obj.data ?? obj.result) as ProductResponse;
        }
        return raw as ProductResponse;
      },
      invalidatesTags: [{ type: "Product", id: "LIST" }],
    }),

    // PUT /product?id=
    updateProduct: builder.mutation<void, UpdateProductArgs>({
      query: ({ id, body }) => ({
        url: `/product?id=${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Product", id },
        { type: "Product", id: "LIST" },
      ],
    }),

    // DELETE /product?id=
    deleteProduct: builder.mutation<void, number>({
      query: (id) => ({
        url: `/product?id=${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Product", id },
        { type: "Product", id: "LIST" },
      ],
    }),

    getTags: builder.query<
      PaginatedResult<Tag>,
      { page?: number; perPage?: number }
    >({
      query: ({ page = 1, perPage = 200 } = {}) =>
        `/tags?page=${page}&perPage=${perPage}`,
      transformResponse: (raw: unknown, _meta, arg) =>
        parsePaginated<Tag>(raw, arg.perPage ?? 200),
      providesTags: [{ type: "Tag", id: "LIST" }],
    }),

    // GET /product-category
    getProductCategories: builder.query<
      PaginatedResult<ProductCategoryResponse>,
      GetCategoriesArgs
    >({
      query: ({ page = 1, perPage = 100 } = {}) =>
        `/product-category?page=${page}&perPage=${perPage}`,
      transformResponse: (raw: unknown, _meta, arg) =>
        parsePaginated<ProductCategoryResponse>(raw, arg.perPage ?? 100),
      providesTags: [{ type: "ProductCategory", id: "LIST" }],
    }),

    // GET /product/stats (KPIs)
    getProductStats: builder.query<
      Record<string, unknown> | null,
      { from?: string; to?: string } | undefined
    >({
      query: (arg) => {
        const params = new URLSearchParams();
        if (arg?.from) params.set("from", arg.from);
        if (arg?.to) params.set("to", arg.to);
        const q = params.toString();
        return `/product/stats${q ? `?${q}` : ""}`;
      },
      transformResponse: parseSummaryResult<Record<string, unknown>>,
    }),
    // GET /product/performance (barras)
    getProductPerformance: builder.query<
      { label: string; value: number; date?: string }[],
      { days?: number; from?: string; to?: string } | undefined
    >({
      query: (arg) => {
        const params = new URLSearchParams();
        params.set("days", String(arg?.days ?? 7));
        if (arg?.from) params.set("from", arg.from);
        if (arg?.to) params.set("to", arg.to);
        return `/product/performance?${params.toString()}`;
      },
      transformResponse: (raw: unknown) =>
        parseChartResult<{ label: string; value: number; date?: string }>(raw),
    }),
    // GET /product/stock-by-category (dona)
    getProductStockByCategory: builder.query<
      { name: string; value: number }[],
      void
    >({
      query: () => "/product/stock-by-category",
      transformResponse: (raw: unknown) =>
        parseChartResult<{ name: string; value: number }>(raw),
    }),

    // POST /product/image (multipart/form-data, campo "file")
    uploadProductImage: builder.mutation<string, File>({
      query: (file) => {
        const body = new FormData();
        body.append("file", file);
        return {
          url: "/product/image",
          method: "POST",
          body,
          formData: true,
        };
      },
      transformResponse: (raw: { result?: { imagenUrl?: string } }) =>
        raw?.result?.imagenUrl ?? "",
    }),

    /** Detalle mínimo para sincronizar `imagenUrl` tras operaciones de galería. */
    getProduct: builder.query<ProductResponse, number>({
      async queryFn(id, _api, _extraOptions, baseQuery) {
        const r1 = await baseQuery(`/product/${id}`);
        if (r1.data) {
          const p = parseProductOne(r1.data);
          if (p) return { data: p };
        }
        const r2 = await baseQuery(`/product?id=${id}&page=1&perPage=1`);
        if (r2.data) {
          const paginated = parsePaginated<ProductResponse>(r2.data, 1);
          const first = paginated.data[0];
          if (first) return { data: first };
          const p = parseProductOne(r2.data);
          if (p) return { data: p };
        }
        return {
          error: r2.error ?? r1.error ?? { status: 404, data: "Not found" },
        };
      },
      providesTags: (_r, _e, id) => [{ type: "Product", id }],
    }),

    getProductImages: builder.query<ProductImageResponse[], number>({
      query: (productId) => `/product/${productId}/images`,
      transformResponse: (raw: unknown) =>
        parseChartResult<Record<string, unknown>>(raw).map((row) =>
          normalizeProductImageRow(row as Record<string, unknown>),
        ),
      providesTags: (_r, _e, productId) => [
        { type: "ProductImages", id: productId },
      ],
    }),

    uploadProductImages: builder.mutation<
      unknown,
      { productId: number; files: File[] }
    >({
      query: ({ productId, files }) => {
        const body = new FormData();
        for (const f of files) body.append("files", f);
        return {
          url: `/product/${productId}/images`,
          method: "POST",
          body,
          formData: true,
        };
      },
      invalidatesTags: (_r, _e, { productId }) => [
        { type: "ProductImages", id: productId },
        { type: "Product", id: productId },
        { type: "Product", id: "LIST" },
      ],
    }),

    setProductImageMain: builder.mutation<
      unknown,
      { productId: number; imageId: number }
    >({
      query: ({ productId, imageId }) => ({
        url: `/product/${productId}/images/${imageId}/main`,
        method: "PUT",
      }),
      invalidatesTags: (_r, _e, { productId }) => [
        { type: "ProductImages", id: productId },
        { type: "Product", id: productId },
        { type: "Product", id: "LIST" },
      ],
    }),

    reorderProductImages: builder.mutation<
      unknown,
      { productId: number; imageIds: number[] }
    >({
      query: ({ productId, imageIds }) => ({
        url: `/product/${productId}/images/reorder`,
        method: "PUT",
        body: imageIds,
      }),
      invalidatesTags: (_r, _e, { productId }) => [
        { type: "ProductImages", id: productId },
        { type: "Product", id: productId },
        { type: "Product", id: "LIST" },
      ],
    }),

    deleteProductImage: builder.mutation<
      unknown,
      { productId: number; imageId: number }
    >({
      query: ({ productId, imageId }) => ({
        url: `/product/${productId}/images/${imageId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { productId }) => [
        { type: "ProductImages", id: productId },
        { type: "Product", id: productId },
        { type: "Product", id: "LIST" },
      ],
    }),
  }),
});

// ─── Exported hooks ───────────────────────────────────────────────────────────

export const {
  useGetProductsQuery,
  useLazyGetProductsQuery,
  useLazyGetProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useGetProductCategoriesQuery,
  useGetTagsQuery,
  useGetProductStatsQuery,
  useGetProductPerformanceQuery,
  useGetProductStockByCategoryQuery,
  useUploadProductImageMutation,
  useGetProductImagesQuery,
  useUploadProductImagesMutation,
  useSetProductImageMainMutation,
  useReorderProductImagesMutation,
  useDeleteProductImageMutation,
} = productsApi;
