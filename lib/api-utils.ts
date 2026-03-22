import type { PaginationInfo } from "./dashboard-types";

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationInfo | null;
}

export function parsePaginated<T>(body: unknown, perPage: number): PaginatedResult<T> {
  let items: T[] = [];
  let pagination: PaginationInfo | null = null;

  // Muchos endpoints ahora envuelven así:
  // { statusCode, customStatusCode, result, pagination }
  let payload: unknown = body;
  let paginationSource: Record<string, unknown> | null = null;

  if (body && typeof body === "object" && "result" in (body as Record<string, unknown>)) {
    const outer = body as Record<string, unknown>;
    payload = outer.result;

    const outerPag = outer.pagination;
    if (outerPag && typeof outerPag === "object") {
      paginationSource = outerPag as Record<string, unknown>;
    } else if (
      payload &&
      typeof payload === "object" &&
      "pagination" in (payload as Record<string, unknown>) &&
      typeof (payload as Record<string, unknown>).pagination === "object"
    ) {
      paginationSource = (payload as Record<string, unknown>)
        .pagination as Record<string, unknown>;
    } else {
      // Fallback: intentamos leer campos planos desde el envoltorio
      paginationSource = outer;
    }
  } else if (body && typeof body === "object") {
    payload = body;
    paginationSource = body as Record<string, unknown>;
  }

  // Extraer items desde payload (que puede ser result, result.data, etc.)
  if (Array.isArray(payload)) {
    items = payload as T[];
  } else if (payload && typeof payload === "object") {
    const b = payload as Record<string, unknown>;
    if (Array.isArray(b.data)) {
      items = b.data as T[];
    } else {
      for (const key of Object.keys(b)) {
        if (Array.isArray(b[key])) {
          items = b[key] as T[];
          break;
        }
      }
    }
  }

  // Extraer paginación desde paginationSource (outer.pagination o similar)
  if (paginationSource) {
    const p = paginationSource;
    pagination = {
      currentPage: Number(
        (p.currentPage as number | undefined) ??
          (p.CurrentPage as number | undefined) ??
          1,
      ),
      totalPages: Number(
        (p.totalPages as number | undefined) ??
          (p.TotalPages as number | undefined) ??
          1,
      ),
      totalCount: Number(
        (p.totalCount as number | undefined) ??
          (p.TotalCount as number | undefined) ??
          items.length,
      ),
      pageSize: Number(
        (p.pageSize as number | undefined) ??
          (p.PageSize as number | undefined) ??
          perPage,
      ),
      hasPreviousPage: Boolean(
        (p.hasPreviousPage as boolean | undefined) ??
          (p.HasPreviousPage as boolean | undefined) ??
          false,
      ),
      hasNextPage: Boolean(
        (p.hasNextPage as boolean | undefined) ??
          (p.HasNextPage as boolean | undefined) ??
          false,
      ),
    };
  }

  return { data: items, pagination };
}

/** Extrae datos de gráficos/listas de la respuesta API { statusCode, result }. result o result.data puede ser el array. */
export function parseChartResult<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  const obj = raw as Record<string, unknown> | null;
  if (!obj) return [];
  const result = obj.result ?? obj.Result ?? obj.data ?? obj.Data ?? obj;
  if (Array.isArray(result)) return result as T[];
  const r = result as Record<string, unknown> | null;
  if (r && Array.isArray(r.data)) return r.data as T[];
  if (r && Array.isArray(r.Data)) return r.Data as T[];
  return [];
}

/** Extrae objeto de resumen/KPIs de la respuesta API { statusCode, result }. */
export function parseSummaryResult<T>(raw: unknown): T | null {
  const obj = raw as Record<string, unknown> | null;
  if (!obj) return null;
  const result = obj.result ?? obj.Result ?? obj.data ?? obj.Data ?? obj;
  if (result && typeof result === "object" && !Array.isArray(result)) return result as T;
  return null;
}
