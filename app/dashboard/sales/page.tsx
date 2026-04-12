"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DataTableAction, DataTableColumn } from "@/components/DataTable";
import { DataTable } from "@/components/DataTable";
import { DatePickerSimple } from "@/components/DatePickerSimple";
import { GridFilterBar, GridFilterSelect } from "@/components/dashboard";
import { Icon } from "@/components/ui/Icon";
import type { SaleOrderResponse } from "@/lib/dashboard-types";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import {
  SEARCH_TABLE_CHUNK_PAGE_SIZE,
  TABLE_SEARCH_DEBOUNCE_MS,
  useLoadAllRemainingPages,
} from "@/lib/useLoadAllRemainingPages";
import { useGetUsersQuery } from "../users/_service/usersApi";
import {
  useCancelOrderMutation,
  useConfirmOrderMutation,
  useGetOrdersQuery,
} from "./_service/salesApi";
import "./sales.css";
import { SaleOrderDetailBody } from "@/components/dashboard-detail/SaleOrderDetailBody";
import { SaleCreateModal } from "./SaleCreateModal";
import { useUserPermissionCodes } from "@/lib/useUserPermissionCodes";

/** Normaliza el estado que puede venir "Draft"/"draft" etc. de la API */
function normalizeStatus(status: string): string {
  const s = (status ?? "").trim().toLowerCase();
  if (s === "draft") return "Draft";
  if (s === "confirmed") return "Confirmed";
  if (s === "cancelled" || s === "canceled") return "Cancelled";
  return status;
}

const STATUS_DISPLAY: Record<
  string,
  { cls: string; icon: string; label: string }
> = {
  Draft: { cls: "sale-status--draft", icon: "pending", label: "Pendiente" },
  Confirmed: {
    cls: "sale-status--confirmed",
    icon: "check_circle",
    label: "Aceptada",
  },
  Cancelled: {
    cls: "sale-status--cancelled",
    icon: "cancel",
    label: "Cancelada",
  },
};

function StatusBadge({ status }: { status: string }) {
  const key = normalizeStatus(status);
  const d = STATUS_DISPLAY[key] ?? {
    cls: "sale-status--draft",
    icon: "help",
    label: status,
  };
  return (
    <span className={`sale-status ${d.cls}`}>
      <Icon name={d.icon} />
      {d.label}
    </span>
  );
}

// ─── Columns ──────────────────────────────────────────────────────────────────

const COLUMNS: DataTableColumn<SaleOrderResponse>[] = [
  { key: "folio", label: "Folio", width: "110px" },
  { key: "locationName", label: "Ubicación" },
  {
    key: "status",
    label: "Estado",
    sortValue: (row) => normalizeStatus(row.status),
    exportValue: (row) =>
      STATUS_DISPLAY[normalizeStatus(row.status)]?.label ?? row.status,
    render: (row) => <StatusBadge status={row.status} />,
  },
  {
    key: (row) => String(row.items.length),
    label: "Productos",
    type: "number",
    width: "90px",
    sortValue: (row) => row.items.length,
  },
  { key: "total", label: "Total", type: "currency" },
  { key: "createdAt", label: "Fecha", type: "date" },
];

const STATUS_FILTERS = [
  { label: "Todas", value: "" },
  { label: "Pendiente", value: "Draft" },
  { label: "Aceptada", value: "Confirmed" },
  { label: "Cancelada", value: "Cancelled" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SalesPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [statusFilter, setStatus] = useState("");
  const [filterText, setFilterText] = useState("");
  const debouncedFilterText = useDebouncedValue(
    filterText,
    TABLE_SEARCH_DEBOUNCE_MS,
  );
  const [saleDateFrom, setSaleDateFrom] = useState("");
  const [saleDateTo, setSaleDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [filterSellerId, setFilterSellerId] = useState("");
  const perPage = Math.max(pageSize, SEARCH_TABLE_CHUNK_PAGE_SIZE);
  const loadNextPage = useCallback(() => setPage((p) => p + 1), []);
  const [allRows, setAllRows] = useState<SaleOrderResponse[]>([]);

  const {
    data: result,
    isLoading,
    isFetching,
  } = useGetOrdersQuery({
    page,
    perPage,
    status: statusFilter,
  });

  const [confirmOrder, { isLoading: isConfirming }] = useConfirmOrderMutation();
  const [cancelOrder, { isLoading: isCancelling }] = useCancelOrderMutation();
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [createSaleOpen, setCreateSaleOpen] = useState(false);
  const filtersChanged = useRef(false);

  const { has: hasPermission } = useUserPermissionCodes();
  const canCreateSale = hasPermission("sale.create");
  const canCancelSale = hasPermission("sale.cancel");

  useEffect(() => {
    if (!result?.data) return;
    if ((result.pagination?.currentPage ?? 1) !== page) return;
    setAllRows((prev) => {
      if (page === 1) return result.data;
      const ids = new Set(prev.map((r) => r.id));
      return [...prev, ...result.data.filter((r) => !ids.has(r.id))];
    });
  }, [result?.data, result?.pagination?.currentPage, page]);

  useLoadAllRemainingPages({
    isFetching,
    pagination: result?.pagination,
    loadNextPage,
  });

  useEffect(() => {
    if (!filtersChanged.current) {
      filtersChanged.current = true;
      return;
    }
    setPage(1);
    setAllRows([]);
  }, []);

  const loadedRows =
    page === 1 && allRows.length === 0 ? (result?.data ?? []) : allRows;

  const { data: usersPage } = useGetUsersQuery({ page: 1, perPage: 500 });

  const userIdToName = useMemo(() => {
    const m = new Map<number, string>();
    for (const u of usersPage?.data ?? []) {
      m.set(u.id, u.fullName?.trim() || u.email?.trim() || String(u.id));
    }
    return m;
  }, [usersPage?.data]);

  const sellerIdsInData = useMemo(() => {
    const s = new Set<number>();
    for (const r of loadedRows) {
      if (r.userId != null && r.userId > 0) s.add(r.userId);
    }
    return [...s].sort((a, b) => a - b);
  }, [loadedRows]);

  const clearGridFilters = () => {
    setFilterText("");
    setSaleDateFrom("");
    setSaleDateTo("");
    setAmountMin("");
    setAmountMax("");
    setFilterSellerId("");
  };

  const filtered = useMemo(() => {
    let rows = loadedRows;
    const q = debouncedFilterText.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.folio.toLowerCase().includes(q) ||
          r.locationName.toLowerCase().includes(q) ||
          String(r.contactName ?? "")
            .toLowerCase()
            .includes(q),
      );
    }
    if (saleDateFrom) {
      const t = new Date(saleDateFrom).getTime();
      rows = rows.filter((r) => new Date(r.createdAt).getTime() >= t);
    }
    if (saleDateTo) {
      const t = new Date(saleDateTo);
      t.setHours(23, 59, 59, 999);
      rows = rows.filter((r) => new Date(r.createdAt).getTime() <= t.getTime());
    }
    const mn = parseFloat(amountMin.replace(",", "."));
    if (!Number.isNaN(mn)) rows = rows.filter((r) => r.total >= mn);
    const mx = parseFloat(amountMax.replace(",", "."));
    if (!Number.isNaN(mx)) rows = rows.filter((r) => r.total <= mx);
    if (filterSellerId !== "") {
      const uid = Number(filterSellerId);
      rows = rows.filter((r) => r.userId === uid);
    }
    return rows;
  }, [
    loadedRows,
    debouncedFilterText,
    saleDateFrom,
    saleDateTo,
    amountMin,
    amountMax,
    filterSellerId,
  ]);

  const gridFiltersActive =
    filterText.trim() !== "" ||
    saleDateFrom !== "" ||
    saleDateTo !== "" ||
    amountMin.trim() !== "" ||
    amountMax.trim() !== "" ||
    filterSellerId !== "";

  const allPagesLoaded =
    result?.pagination != null && page >= (result.pagination.totalPages ?? 1);

  const isBusy = isConfirming || isCancelling;

  const actions: DataTableAction<SaleOrderResponse>[] = [
    {
      icon:
        processingId !== null && isConfirming
          ? "hourglass_empty"
          : "check_circle",
      label: isConfirming ? "Aceptando…" : "Aceptar",
      onClick: async (row) => {
        setProcessingId(row.id);
        try {
          await confirmOrder(row.id).unwrap();
          setPage(1);
          setAllRows([]);
        } finally {
          setProcessingId(null);
        }
      },
      hidden: (row) =>
        normalizeStatus(row.status) !== "Draft" || !canCreateSale,
      disabled: (row) => isBusy && processingId !== row.id,
    },
    {
      icon:
        processingId !== null && isCancelling ? "hourglass_empty" : "cancel",
      label: isCancelling ? "Cancelando…" : "Cancelar",
      onClick: async (row) => {
        setProcessingId(row.id);
        try {
          await cancelOrder(row.id).unwrap();
          setPage(1);
          setAllRows([]);
        } finally {
          setProcessingId(null);
        }
      },
      variant: "danger",
      hidden: (row) =>
        normalizeStatus(row.status) === "Cancelled" || !canCancelSale,
      disabled: (row) => isBusy && processingId !== row.id,
    },
  ];

  return (
    <>
    <DataTable
      gridConfig={{
        storageKey: "dashboard-sales",
        exportFilenamePrefix: "ventas",
        primaryColumnKey: "folio",
        bulkEntityLabel: "ventas",
      }}
      filters={
        <GridFilterBar
          onClear={() => {
            clearGridFilters();
            setStatus("");
          }}
        >
          <div className="grid-filter-bar__field">
            <span className="grid-filter-bar__label">Buscar</span>
            <input
              type="search"
              className={`grid-filter-bar__control grid-filter-bar__control--wide ${filterText.trim() ? "grid-filter-bar__control--active" : ""}`}
              placeholder="Cliente, folio, referencia…"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </div>
          <div className="grid-filter-bar__field">
            <span className="grid-filter-bar__label">Estado</span>
            <GridFilterSelect
              aria-label="Estado de venta"
              value={statusFilter}
              onChange={setStatus}
              active={statusFilter !== ""}
              className="grid-filter-bar__control--medium"
              options={STATUS_FILTERS.map((f) => ({
                value: f.value,
                label: f.label,
              }))}
            />
          </div>
          <div className="grid-filter-bar__field">
            <span className="grid-filter-bar__label">Desde</span>
            <DatePickerSimple
              date={saleDateFrom}
              setDate={setSaleDateFrom}
              emptyLabel="Seleccionar"
              buttonClassName={`grid-filter-bar__date-trigger grid-filter-bar__control--medium ${saleDateFrom ? "grid-filter-bar__control--active" : ""}`}
            />
          </div>
          <div className="grid-filter-bar__field">
            <span className="grid-filter-bar__label">Hasta</span>
            <DatePickerSimple
              date={saleDateTo}
              setDate={setSaleDateTo}
              emptyLabel="Seleccionar"
              buttonClassName={`grid-filter-bar__date-trigger grid-filter-bar__control--medium ${saleDateTo ? "grid-filter-bar__control--active" : ""}`}
            />
          </div>
          <div className="grid-filter-bar__field">
            <span className="grid-filter-bar__label">Monto</span>
            <div className="grid-filter-bar__price-range">
              <input
                type="text"
                inputMode="decimal"
                className={`grid-filter-bar__control grid-filter-bar__control--narrow ${amountMin.trim() ? "grid-filter-bar__control--active" : ""}`}
                placeholder="Min"
                aria-label="Monto mínimo"
                value={amountMin}
                onChange={(e) => setAmountMin(e.target.value)}
              />
              <span className="grid-filter-bar__price-dash" aria-hidden>
                –
              </span>
              <input
                type="text"
                inputMode="decimal"
                className={`grid-filter-bar__control grid-filter-bar__control--narrow ${amountMax.trim() ? "grid-filter-bar__control--active" : ""}`}
                placeholder="Max"
                aria-label="Monto máximo"
                value={amountMax}
                onChange={(e) => setAmountMax(e.target.value)}
              />
            </div>
          </div>
          {sellerIdsInData.length > 0 ? (
            <div className="grid-filter-bar__field">
              <span className="grid-filter-bar__label">Vendedor</span>
              <GridFilterSelect
                aria-label="Vendedor"
                value={filterSellerId}
                onChange={setFilterSellerId}
                active={filterSellerId !== ""}
                className="grid-filter-bar__control--medium"
                options={[
                  { value: "", label: "Todos" },
                  ...sellerIdsInData.map((id) => ({
                    value: String(id),
                    label: userIdToName.get(id) ?? String(id),
                  })),
                ]}
              />
            </div>
          ) : null}
        </GridFilterBar>
      }
      data={filtered}
      columns={COLUMNS}
      loading={allRows.length === 0 && (isLoading || isFetching)}
      title="Órdenes de Venta"
      titleIcon="point_of_sale"
      toolbarExtra={
        canCreateSale ? (
          <button
            type="button"
            className="dt-btn-add"
            onClick={() => setCreateSaleOpen(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Icon name="add_shopping_cart" />
            Nueva venta
          </button>
        ) : undefined
      }
      actions={actions}
      infiniteScroll
      hasMore={!allPagesLoaded}
      loadingMore={isFetching && !allPagesLoaded}
      emptyIcon="receipt_long"
      emptyTitle="Sin órdenes"
      emptyDesc={
        (gridFiltersActive || statusFilter) && loadedRows.length > 0
          ? "Ninguna orden coincide con los filtros."
          : "Aún no hay órdenes de venta"
      }
      detailDrawer={{
        entityLabelPlural: "ventas",
        getTitle: (row) => row.folio || `Orden #${row.id}`,
        getStatusBadge: (row) => <StatusBadge status={row.status} />,
        render: (row) => <SaleOrderDetailBody row={row} />,
        showEditButton: false,
      }}
    />
    <SaleCreateModal
      open={createSaleOpen}
      onClose={() => setCreateSaleOpen(false)}
      onSuccess={() => {
        setPage(1);
        setAllRows([]);
      }}
    />
    </>
  );
}
