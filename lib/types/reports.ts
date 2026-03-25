/**
 * Filtros alineados con GET /api/reports/* (query).
 * dateFrom / dateTo en ISO 8601 (DateTime), no usar startDate/endDate en la petición.
 */
export interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  locationId?: number;
}

/** Paginación solo para endpoints que la soportan (p. ej. GET /api/reports/sales). */
export type ReportRequestParams = ReportFilters & {
  page?: number;
  pageSize?: number;
};

/** Patrón de envoltorio HTTP usado en el cliente (parseSummaryResult en lib/api-utils). */
export interface ApiOkResponse<T> {
  statusCode: number;
  customStatusCode?: number;
  message?: string;
  result: T;
}

// ─── GET /api/reports/sales ─────────────────────────────────────────────────

export interface SalesByDayDto {
  date: string;
  total: number;
}

export interface ReturnsByDayDto {
  date: string;
  total: number;
}

export interface SalesOrderRowDto {
  id: number;
  folio: string | null;
  createdAt: string;
  total: number;
  status: string;
  locationId: number;
  locationName: string | null;
  contactId: number | null;
  contactName: string | null;
  itemsCount: number;
  subtotal: number;
  discountAmount: number;
}

/** Una página de pedidos; agregados del periodo + metadatos de paginación en servidor. */
export interface SalesReportResponse {
  totalSales: number;
  totalReturns: number;
  netSales: number;
  /** Agregados del periodo / ubicación (puede coexistir con totalOrdersCount). */
  totalOrders?: number;
  averageTicket: number;
  salesByDay: SalesByDayDto[];
  returnsByDay: ReturnsByDayDto[];
  orders: SalesOrderRowDto[];
  page: number;
  pageSize: number;
  /** Total de pedidos que cumplen el filtro (para UI: ceil(totalOrdersCount / pageSize)). */
  totalOrdersCount: number;
}

// ─── GET /api/reports/inventory ─────────────────────────────────────────────

export interface LowStockProductDto {
  productId: number;
  productCode: string | null;
  productName: string | null;
  totalStock: number;
}

export interface StockByProductDto {
  productId: number;
  productCode: string | null;
  productName: string | null;
  totalStock: number;
}

export interface MovementsSummaryDto {
  totalMovements: number;
  entries: number;
  exits: number;
  adjustments: number;
}

/** Fila de detalle de movimientos (límite fijo en servidor; ajustar campos tras fetch real). */
export interface InventoryMovementDetailDto {
  id?: number;
  createdAt?: string;
  type?: string;
  quantity?: number;
  productId?: number;
  productCode?: string | null;
  productName?: string | null;
  locationId?: number;
  locationName?: string | null;
  [key: string]: unknown;
}

export interface InventoryReportResponse {
  totalStock: number;
  inventoryValue: number;
  lowStockProducts: LowStockProductDto[];
  stockByProduct: StockByProductDto[];
  movementsSummary: MovementsSummaryDto;
  movementDetails: InventoryMovementDetailDto[];
}

// ─── GET /api/reports/products ───────────────────────────────────────────────

export interface TopSellingProductDto {
  productId: number;
  productCode: string | null;
  productName: string | null;
  quantitySold: number;
  revenue: number;
  unitCost: number;
  averagePrice: number;
  totalReturned: number;
}

export interface CategoryDistributionDto {
  categoryId: number | null;
  categoryName: string | null;
  productsCount: number;
}

export interface ProductsReportResponse {
  totalProducts: number;
  activeProducts: number;
  topSellingProducts: TopSellingProductDto[];
  categoryDistribution: CategoryDistributionDto[];
}

// ─── GET /api/reports/crm ────────────────────────────────────────────────────

export interface LeadRowDto {
  leadId: number;
  name: string | null;
  company: string | null;
  status: string;
  createdAt: string;
  convertedToContactId: number | null;
  convertedAt: string | null;
  contactName: string | null;
}

export interface CrmReportResponse {
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  leads: LeadRowDto[];
}

// ─── GET /api/reports/operations ─────────────────────────────────────────────

export interface MovementsByTypeDto {
  type: string;
  count: number;
  quantitySum: number;
}

export interface OperationsMovementDetailDto {
  id?: number;
  createdAt?: string;
  type?: string;
  quantity?: number;
  [key: string]: unknown;
}

export interface SupplierSummaryRowDto {
  supplierId?: number;
  supplierName?: string | null;
  count?: number;
  quantitySum?: number;
  [key: string]: unknown;
}

export interface OperationsReportResponse {
  totalMovements: number;
  entries: number;
  exits: number;
  adjustments: number;
  movementsByType: MovementsByTypeDto[];
  movementDetails: OperationsMovementDetailDto[];
  supplierSummary: SupplierSummaryRowDto[];
}
