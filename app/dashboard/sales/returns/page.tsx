"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DataTableColumn } from "@/components/DataTable";
import { DataTable } from "@/components/DataTable";
import { Icon } from "@/components/ui/Icon";
import type { SaleReturnResponse } from "@/lib/dashboard-types";
import { formatDisplayCurrency } from "@/lib/formatCurrency";
import {
  SEARCH_TABLE_CHUNK_PAGE_SIZE,
  useLoadAllRemainingPages,
} from "@/lib/useLoadAllRemainingPages";
import { useUserPermissionCodes } from "@/lib/useUserPermissionCodes";
import { useGetSaleReturnsQuery } from "../_service/salesApi";
import "../sales.css";

const COLUMNS: DataTableColumn<SaleReturnResponse>[] = [
  { key: "saleOrderFolio", label: "Venta", width: "120px" },
  { key: "locationName", label: "Ubicación" },
  { key: "status", label: "Estado", width: "110px" },
  { key: "total", label: "Total", type: "currency" },
  { key: "createdAt", label: "Fecha", type: "date" },
];

export default function SaleReturnsPage() {
  const [page, setPage] = useState(1);
  const perPage = Math.max(10, SEARCH_TABLE_CHUNK_PAGE_SIZE);
  const loadNextPage = useCallback(() => setPage((p) => p + 1), []);
  const [allRows, setAllRows] = useState<SaleReturnResponse[]>([]);

  const { has: hasPermission } = useUserPermissionCodes();
  const canRead = hasPermission("sale.read");

  const { data: result, isLoading, isFetching } = useGetSaleReturnsQuery(
    { page, perPage, sortOrder: "desc" },
    { skip: !canRead },
  );

  useEffect(() => {
    if (!result?.data) return;
    setAllRows((prev) => {
      if (page === 1) return result.data;
      const ids = new Set(prev.map((r) => r.id));
      return [...prev, ...result.data.filter((r) => !ids.has(r.id))];
    });
  }, [result?.data, page]);

  useLoadAllRemainingPages({
    isFetching,
    pagination: result?.pagination,
    loadNextPage,
  });

  const loadedRows =
    page === 1 && allRows.length === 0 ? (result?.data ?? []) : allRows;

  const allPagesLoaded =
    result?.pagination != null && page >= (result.pagination.totalPages ?? 1);

  const renderMobileReturnRow = useCallback((row: SaleReturnResponse) => {
    const folio =
      row.saleOrderFolio?.trim() || `Venta #${row.saleOrderId}`;
    const status = (row.status ?? "").trim() || "—";
    return (
      <div className="dt-mobile-row">
        <div className="dt-mobile-row__body">
          <div className="dt-mobile-row__title" title={folio}>
            {folio}
          </div>
          <div className="dt-mobile-row__meta">{status}</div>
        </div>
        <span className="dt-mobile-row__end">
          {formatDisplayCurrency(row.total)}
        </span>
      </div>
    );
  }, []);

  const toolbar = useMemo(
    () => (
      <Link
        href="/dashboard/sales"
        className="dt-btn-add"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          textDecoration: "none",
        }}
      >
        <Icon name="point_of_sale" />
        Ir a órdenes de venta
      </Link>
    ),
    [],
  );

  if (!canRead) {
    return (
      <div className="dashboard-card" style={{ padding: 24 }}>
        <h1 className="dashboard-page-title">Devoluciones</h1>
        <p style={{ marginTop: 12, color: "#64748b" }}>
          No tienes permiso para ver devoluciones (se requiere{" "}
          <code>sale.read</code>).
        </p>
      </div>
    );
  }

  return (
    <DataTable
      gridConfig={{
        storageKey: "dashboard-sale-returns",
        exportFilenamePrefix: "devoluciones",
        primaryColumnKey: "saleOrderFolio",
        bulkEntityLabel: "devoluciones",
      }}
      data={loadedRows}
      columns={COLUMNS}
      loading={allRows.length === 0 && (isLoading || isFetching)}
      title="Devoluciones de venta"
      titleIcon="rotate_ccw"
      toolbarExtra={toolbar}
      infiniteScroll
      hasMore={!allPagesLoaded}
      loadingMore={isFetching && !allPagesLoaded}
      emptyIcon="rotate_ccw"
      emptyTitle="Sin devoluciones"
      emptyDesc="Registra una devolución desde una venta confirmada (órdenes de venta)."
      renderMobileRowSummary={renderMobileReturnRow}
    />
  );
}
