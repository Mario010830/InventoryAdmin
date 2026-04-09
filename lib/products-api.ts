import { getApiUrl, getToken } from "@/lib/auth-api";
import type {
  CreateProductRequest,
  PaginationInfo,
  ProductCategoryResponse,
  ProductResponse,
  UpdateProductRequest,
} from "./dashboard-types";

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationInfo | null;
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "ngrok-skip-browser-warning": "true",
      ...options?.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(
      (data as { message?: string }).message ?? "Error en la solicitud.",
    );
  return data as T;
}

function parsePaginated<T>(body: unknown, perPage: number): PaginatedResult<T> {
  let items: T[] = [];
  let pagination: PaginationInfo | null = null;

  if (Array.isArray(body)) {
    items = body as T[];
  } else if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    if (Array.isArray(b.data)) items = b.data as T[];
    else {
      for (const key of Object.keys(b)) {
        if (Array.isArray(b[key])) {
          items = b[key] as T[];
          break;
        }
      }
    }
    const p = b.currentPage ?? (b as Record<string, unknown>).CurrentPage ?? 1;
    const totalP =
      b.totalPages ?? (b as Record<string, unknown>).TotalPages ?? 1;
    const totalC =
      b.totalCount ?? (b as Record<string, unknown>).TotalCount ?? items.length;
    const pSize =
      b.pageSize ?? (b as Record<string, unknown>).PageSize ?? perPage;
    pagination = {
      currentPage: Number(p),
      totalPages: Number(totalP),
      totalCount: Number(totalC),
      pageSize: Number(pSize),
      hasPreviousPage: Boolean(
        b.hasPreviousPage ??
          (b as Record<string, unknown>).HasPreviousPage ??
          false,
      ),
      hasNextPage: Boolean(
        b.hasNextPage ?? (b as Record<string, unknown>).HasNextPage ?? false,
      ),
    };
  }
  return { data: items, pagination };
}

export async function getProducts(
  page = 1,
  perPage = 10,
  sortOrder = "desc",
): Promise<PaginatedResult<ProductResponse>> {
  const url = `${getApiUrl()}/product?page=${page}&perPage=${perPage}&sortOrder=${sortOrder}`;
  const data = await fetchJson<unknown>(url);
  return parsePaginated<ProductResponse>(data, perPage);
}

export async function createProduct(
  body: CreateProductRequest,
): Promise<ProductResponse> {
  const data = await fetchJson<ProductResponse | { data: ProductResponse }>(
    `${getApiUrl()}/product`,
    { method: "POST", body: JSON.stringify(body) },
  );
  return "data" in data ? data.data : data;
}

export async function updateProduct(
  id: number,
  body: UpdateProductRequest,
): Promise<void> {
  await fetchJson(`${getApiUrl()}/product?id=${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function deleteProduct(id: number): Promise<void> {
  await fetchJson(`${getApiUrl()}/product?id=${id}`, { method: "DELETE" });
}

export async function getProductCategories(
  page = 1,
  perPage = 100,
): Promise<PaginatedResult<ProductCategoryResponse>> {
  const url = `${getApiUrl()}/product-category?page=${page}&perPage=${perPage}`;
  const data = await fetchJson<unknown>(url);
  return parsePaginated<ProductCategoryResponse>(data, perPage);
}
