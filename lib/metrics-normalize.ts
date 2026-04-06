import type {
  CustomersMetricsNormalized,
  ProductsMetricsNormalized,
  SalesFunnelStep,
  SalesMetricsNormalized,
  TrafficMetricsNormalized,
} from "@/lib/types/metrics";

function num(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return 0;
}

function numOrNull(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

function firstRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

export function normalizeTrafficMetrics(
  raw: unknown,
): TrafficMetricsNormalized {
  const o = firstRecord(raw) ?? {};
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      if (k in o) return o[k];
    }
    return undefined;
  };

  const sourcesRaw = pick("sources", "trafficSources", "TrafficSources");
  const searchesRaw = pick("topSearches", "TopSearches", "searches");

  let sources: { label: string; value: number }[] = [];
  if (Array.isArray(sourcesRaw)) {
    sources = sourcesRaw.map((row) => {
      const r = firstRecord(row) ?? {};
      const label = String(r.label ?? r.name ?? r.source ?? r.key ?? "—");
      const value = num(r.value ?? r.count ?? r.visits);
      return { label, value };
    });
  }

  let topSearches: { term: string; visits: number }[] = [];
  if (Array.isArray(searchesRaw)) {
    topSearches = searchesRaw.map((row) => {
      const r = firstRecord(row) ?? {};
      const term = String(r.term ?? r.query ?? r.search ?? r.name ?? "—");
      const visits = num(r.visits ?? r.count ?? r.value);
      return { term, visits };
    });
  }

  return {
    catalogVisits: num(
      pick("catalogVisits", "CatalogVisits", "visits", "catalog_visits"),
    ),
    catalogVisitsChangePct: numOrNull(
      pick(
        "catalogVisitsChangePct",
        "catalogVisitsChange",
        "visitsChangePct",
        "catalog_visits_change_pct",
      ),
    ),
    uniqueVisitors: num(
      pick("uniqueVisitors", "UniqueVisitors", "unique_visitors"),
    ),
    uniqueVisitorsChangePct: numOrNull(
      pick(
        "uniqueVisitorsChangePct",
        "uniqueVisitorsChange",
        "unique_visitors_change_pct",
      ),
    ),
    bounceRatePct: numOrNull(
      pick("bounceRatePct", "bounceRate", "BounceRate", "bounce_rate_pct"),
    ),
    bounceRateChangePct: numOrNull(
      pick("bounceRateChangePct", "bounceRateChange", "bounce_rate_change_pct"),
    ),
    avgTimeOnCatalogSeconds: numOrNull(
      pick(
        "avgTimeOnCatalogSeconds",
        "avgTimeOnCatalog",
        "averageTimeOnCatalogSeconds",
        "avg_time_on_catalog_seconds",
      ),
    ),
    sources,
    topSearches,
  };
}

export function normalizeProductsMetrics(
  raw: unknown,
): ProductsMetricsNormalized {
  const o = firstRecord(raw) ?? {};
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      if (k in o) return o[k];
    }
    return undefined;
  };

  const mvRaw = pick("mostViewed", "MostViewed", "most_viewed");
  const vtcRaw = pick("viewToCartRate", "ViewToCartRate", "view_to_cart");

  let mostViewed: { name: string; count: number }[] = [];
  if (Array.isArray(mvRaw)) {
    mostViewed = mvRaw.map((row) => {
      const r = firstRecord(row) ?? {};
      const name = String(r.name ?? r.productName ?? r.title ?? "—");
      const count = num(r.count ?? r.views ?? r.value);
      return { name, count };
    });
  }

  let viewToCartRate: { name: string; ratePct: number }[] = [];
  if (Array.isArray(vtcRaw)) {
    viewToCartRate = vtcRaw.map((row) => {
      const r = firstRecord(row) ?? {};
      const name = String(r.name ?? r.productName ?? r.title ?? "—");
      const ratePct = num(r.ratePct ?? r.rate ?? r.percent ?? r.value);
      return { name, ratePct };
    });
  }

  return {
    activeProducts: num(
      pick("activeProducts", "ActiveProducts", "active_products"),
    ),
    totalViews: num(pick("totalViews", "TotalViews", "total_views")),
    productsWithNoSales: num(
      pick(
        "productsWithNoSales",
        "ProductsWithNoSales",
        "products_with_no_sales",
      ),
    ),
    savedOrFavorited: num(
      pick(
        "savedOrFavorited",
        "savedFavorited",
        "SavedFavorited",
        "favorites",
        "saved_count",
      ),
    ),
    mostViewed,
    viewToCartRate,
  };
}

export function normalizeSalesMetrics(raw: unknown): SalesMetricsNormalized {
  const o = firstRecord(raw) ?? {};
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      if (k in o) return o[k];
    }
    return undefined;
  };

  const funnelRaw = pick("funnel", "Funnel", "conversionFunnel");
  let funnel: SalesFunnelStep[] = [];
  if (Array.isArray(funnelRaw)) {
    funnel = funnelRaw.map((row, i) => {
      const r = firstRecord(row) ?? {};
      const label = String(r.label ?? r.step ?? r.name ?? `Paso ${i + 1}`);
      const key = String(r.key ?? `step-${i}`);
      const count = num(r.count ?? r.value);
      const dropFromPreviousPct = numOrNull(
        r.dropFromPreviousPct ?? r.dropPct ?? r.drop_percent,
      );
      return { key, label, count, dropFromPreviousPct };
    });
  }

  if (funnel.length === 0) {
    const visits = num(pick("funnelVisits", "visits"));
    const productViews = num(pick("funnelProductViews", "productViews"));
    const addedToCart = num(pick("funnelAddedToCart", "addedToCart"));
    const completed = num(pick("funnelCompleted", "completed", "orders"));

    const steps = [
      { key: "visits", label: "Visitas", count: visits },
      { key: "views", label: "Vistas de producto", count: productViews },
      { key: "cart", label: "Añadidos al carrito", count: addedToCart },
      { key: "done", label: "Completados", count: completed },
    ];
    let prev = 0;
    funnel = steps.map((s, i) => {
      let dropFromPreviousPct: number | null = null;
      if (i > 0 && prev > 0) {
        dropFromPreviousPct = ((prev - s.count) / prev) * 100;
      }
      prev = s.count;
      return { ...s, dropFromPreviousPct };
    });
  }

  return {
    revenue: num(pick("revenue", "Revenue", "totalRevenue")),
    revenueChangePct: numOrNull(
      pick("revenueChangePct", "revenueChange", "revenue_change_pct"),
    ),
    orders: num(pick("orders", "Orders", "orderCount")),
    ordersChangePct: numOrNull(
      pick("ordersChangePct", "ordersChange", "orders_change_pct"),
    ),
    avgOrderValue: num(
      pick("avgOrderValue", "averageOrderValue", "aov", "AvgOrderValue"),
    ),
    avgOrderValueChangePct: numOrNull(
      pick(
        "avgOrderValueChangePct",
        "aovChangePct",
        "avg_order_value_change_pct",
      ),
    ),
    cartAbandonmentRatePct: numOrNull(
      pick("cartAbandonmentRatePct", "cartAbandonmentRate", "abandonmentRate"),
    ),
    cartAbandonmentChangePct: numOrNull(
      pick("cartAbandonmentChangePct", "abandonment_change_pct"),
    ),
    funnel,
  };
}

export function normalizeCustomersMetrics(
  raw: unknown,
): CustomersMetricsNormalized {
  const o = firstRecord(raw) ?? {};
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      if (k in o) return o[k];
    }
    return undefined;
  };

  const distRaw = pick(
    "ratingsDistribution",
    "RatingsDistribution",
    "ratingDistribution",
    "starsDistribution",
  );
  let ratingsDistribution: { stars: number; count: number }[] = [];
  if (Array.isArray(distRaw)) {
    ratingsDistribution = distRaw
      .map((row) => {
        const r = firstRecord(row) ?? {};
        const stars = Math.round(num(r.stars ?? r.star ?? r.rating ?? r.label));
        const count = num(r.count ?? r.value);
        return { stars, count };
      })
      .filter((x) => x.stars >= 1 && x.stars <= 5);
  }

  const newB = num(pick("newBuyers", "NewBuyers", "new_buyers"));
  const retB = num(pick("returningBuyers", "ReturningBuyers"));

  let buyersNew = num(pick("buyersNew", "newBuyerCount"));
  let buyersReturning = num(pick("buyersReturning", "returningBuyerCount"));
  if (buyersNew === 0 && buyersReturning === 0 && (newB > 0 || retB > 0)) {
    buyersNew = newB;
    buyersReturning = retB;
  }

  return {
    newBuyers: newB,
    returningBuyers: retB,
    avgRating: numOrNull(pick("avgRating", "averageRating", "AvgRating")),
    reviewsReceived: num(
      pick("reviewsReceived", "ReviewsReceived", "reviewCount"),
    ),
    buyersNew,
    buyersReturning,
    ratingsDistribution,
  };
}
