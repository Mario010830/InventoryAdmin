import { parseSummaryResult } from "@/lib/api-utils";
import { getApiUrl, getToken } from "@/lib/auth-api";
import {
  normalizeCustomersMetrics,
  normalizeProductsMetrics,
  normalizeSalesMetrics,
  normalizeTrafficMetrics,
} from "@/lib/metrics-normalize";
import type {
  CustomersMetricsNormalized,
  MetricsPeriod,
  MetricsSection,
  ProductsMetricsNormalized,
  SalesMetricsNormalized,
  TrafficMetricsNormalized,
} from "@/lib/types/metrics";

function parseErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "message" in body) {
    const m = (body as { message?: unknown }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  return fallback;
}

async function fetchJson(url: string): Promise<{ ok: boolean; body: unknown }> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  const body: unknown = await res.json().catch(() => null);
  return { ok: res.ok, body };
}

export type MetricsBundle = {
  traffic: TrafficMetricsNormalized | null;
  products: ProductsMetricsNormalized | null;
  sales: SalesMetricsNormalized | null;
  customers: CustomersMetricsNormalized | null;
  errors: Partial<Record<MetricsSection, string>>;
};

export async function fetchAllMetrics(
  businessId: number,
  period: MetricsPeriod,
): Promise<MetricsBundle> {
  const base = getApiUrl().replace(/\/$/, "");
  const sections: MetricsSection[] = [
    "traffic",
    "products",
    "sales",
    "customers",
  ];

  const results = await Promise.all(
    sections.map(async (section) => {
      const url = `${base}/metrics/${businessId}/${section}?period=${encodeURIComponent(period)}`;
      try {
        const { ok, body } = await fetchJson(url);
        if (!ok) {
          const sectionLabel =
            section === "traffic"
              ? "tráfico"
              : section === "products"
                ? "productos"
                : section === "sales"
                  ? "ventas"
                  : "clientes";
          return {
            section,
            error: parseErrorMessage(
              body,
              `Error al cargar métricas de ${sectionLabel}`,
            ),
            data: null as unknown,
          };
        }
        const parsed = parseSummaryResult<Record<string, unknown>>(body);
        return { section, error: null as string | null, data: parsed };
      } catch (e) {
        return {
          section,
          error: e instanceof Error ? e.message : "Error de red",
          data: null,
        };
      }
    }),
  );

  const errors: Partial<Record<MetricsSection, string>> = {};
  let traffic: TrafficMetricsNormalized | null = null;
  let products: ProductsMetricsNormalized | null = null;
  let sales: SalesMetricsNormalized | null = null;
  let customers: CustomersMetricsNormalized | null = null;

  for (const r of results) {
    if (r.error) {
      errors[r.section] = r.error;
      continue;
    }
    if (!r.data) continue;
    switch (r.section) {
      case "traffic":
        traffic = normalizeTrafficMetrics(r.data);
        break;
      case "products":
        products = normalizeProductsMetrics(r.data);
        break;
      case "sales":
        sales = normalizeSalesMetrics(r.data);
        break;
      case "customers":
        customers = normalizeCustomersMetrics(r.data);
        break;
      default:
        break;
    }
  }

  return { traffic, products, sales, customers, errors };
}
