export interface DailySummaryInventoryItem {
  productId: number;
  productName: string;
  quantitySold: number;
  stockBefore: number;
  stockAfter: number;
  stockDifference: number;
}

export interface DailySummary {
  id: number;
  date: string;
  openingCash: number;
  totalSales: number;
  totalReturns: number;
  totalOutflows: number;
  expectedCash: number;
  actualCash: number;
  difference: number;
  status: "Balanced" | "Surplus" | "Shortage";
  notes?: string;
  isClosed: boolean;
  inventoryItems: DailySummaryInventoryItem[];
}

export interface GenerateDailySummaryRequest {
  date: string;
  /** Solo requerido para admins sin ubicación fija (locationId <= 0 en el usuario) */
  locationId?: number;
  openingCash: number;
  actualCash: number;
  notes?: string;
}

export interface DailySummaryExportRequest {
  date: string;
}
