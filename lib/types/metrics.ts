/** Query string sent to GET /metrics/{businessId}/{section} */
export type MetricsPeriod = "7d" | "30d" | "90d";

export type MetricsSection = "traffic" | "products" | "sales" | "customers";

/** Normalized payloads (backend may use different property names; see metrics-normalize). */

export interface TrafficMetricsNormalized {
  catalogVisits: number;
  catalogVisitsChangePct: number | null;
  uniqueVisitors: number;
  uniqueVisitorsChangePct: number | null;
  bounceRatePct: number | null;
  bounceRateChangePct: number | null;
  avgTimeOnCatalogSeconds: number | null;
  sources: { label: string; value: number }[];
  topSearches: { term: string; visits: number }[];
}

export interface ProductsMetricsNormalized {
  activeProducts: number;
  totalViews: number;
  productsWithNoSales: number;
  savedOrFavorited: number;
  mostViewed: { name: string; count: number }[];
  viewToCartRate: { name: string; ratePct: number }[];
}

export interface SalesFunnelStep {
  key: string;
  label: string;
  count: number;
  dropFromPreviousPct: number | null;
}

export interface SalesMetricsNormalized {
  revenue: number;
  revenueChangePct: number | null;
  orders: number;
  ordersChangePct: number | null;
  avgOrderValue: number;
  avgOrderValueChangePct: number | null;
  cartAbandonmentRatePct: number | null;
  cartAbandonmentChangePct: number | null;
  funnel: SalesFunnelStep[];
}

export interface CustomersMetricsNormalized {
  newBuyers: number;
  returningBuyers: number;
  avgRating: number | null;
  reviewsReceived: number;
  buyersNew: number;
  buyersReturning: number;
  ratingsDistribution: { stars: number; count: number }[];
}
