"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DataTableColumn } from "@/components/DataTable";
import { DataTable } from "@/components/DataTable";
import { DatePickerSimple } from "@/components/DatePickerSimple";
import { GridFilterBar, GridFilterSelect } from "@/components/dashboard";
import { InventoryDetailBody } from "@/components/dashboard-detail/entityDetailBodies";
import type { InventoryResponse } from "@/lib/dashboard-types";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { useDefaultLocation } from "@/lib/useDefaultLocation";
import {
  SEARCH_TABLE_CHUNK_PAGE_SIZE,
  TABLE_SEARCH_DEBOUNCE_MS,
  useLoadAllRemainingPages,
} from "@/lib/useLoadAllRemainingPages";
import { useAppSelector } from "@/store/store";
import { useGetLocationsQuery } from "../locations/_service/locationsApi";
import {
  useGetProductCategoriesQuery,
  useGetProductsQuery,
} from "../products/_service/productsApi";
import { useGetInventoriesQuery } from "./_service/inventoryApi";

const COLUMNS: DataTableColumn<InventoryResponse>[] = [
  { key: "productName", label: "Producto", width: "180px" },
  { key: "currentStock", label: "Stock actual", type: "number" },
  { key: "unitOfMeasure", label: "Unidad" },
  { key: "locationName", label: "Ubicación", width: "180px" },
  { key: "createdAt", label: "Creado", type: "date" },
];

export default function InventoryPage() {
  const [page, setPage] = useState(1);
  const [pageSize, _setPageSize] = useState(10);
  const [filterText, setFilterText] = useState("");
  const debouncedFilterText = useDebouncedValue(
    filterText,
    TABLE_SEARCH_DEBOUNCE_MS,
  );
  const [filterLocationId, setFilterLocationId] = useState<string>("");
  const [filterCategoryId, setFilterCategoryId] = useState<string>("");
  const [onlyCriticalStock, setOnlyCriticalStock] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const orgId = useAppSelector((s) => s.auth?.organizationId) ?? 0;
  const perPage = Math.max(pageSize, SEARCH_TABLE_CHUNK_PAGE_SIZE);
  const loadNextPage = useCallback(() => setPage((p) => p + 1), []);
  const filtersChanged = useRef(false);

  const {
    data: result,
    isLoading,
    isFetching,
  } = useGetInventoriesQuery({ page, perPage });
  const { data: productsLookup } = useGetProductsQuery({
    page: 1,
    perPage: 500,
  });
  const { data: categoriesResult } = useGetProductCategoriesQuery({
    perPage: 100,
  });
  const categories = categoriesResult?.data ?? [];
  const { data: locationsLookup } = useGetLocationsQuery({
    page: 1,
    perPage: 200,
    ...(orgId ? { organizationId: orgId } : {}),
  });
  const [allRows, setAllRows] = useState<InventoryResponse[]>([]);

  const productIdToCategoryId = useMemo(() => {
    const m = new Map<number, number>();
    for (const p of productsLookup?.data ?? []) {
      m.set(p.id, p.categoryId);
    }
    return m;
  }, [productsLookup?.data]);

  useEffect(() => {
    if (!result?.data) return;
    setAllRows((prev) => {
      if (page === 1) return result.data;
      const existingIds = new Set(prev.map((r) => r.id));
      const fresh = result.data.filter((r) => !existingIds.has(r.id));
      return [...prev, ...fresh];
    });
  }, [result?.data, page]);

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

  const clearGridFilters = () => {
    setFilterText("");
    setFilterLocationId("");
    setFilterCategoryId("");
    setOnlyCriticalStock(false);
    setDateFrom("");
    setDateTo("");
  };

  const filteredData = useMemo(() => {
    let rows = loadedRows;
    const q = debouncedFilterText.trim().toLowerCase();
    if (q) {
      rows = rows.filter((row) =>
        String(
          (row as InventoryResponse & { productName?: string }).productName ??
            "",
        )
          .toLowerCase()
          .includes(q),
      );
    }
    if (filterLocationId !== "") {
      const lid = Number(filterLocationId);
      rows = rows.filter((r) => r.locationId === lid);
    }
    if (filterCategoryId !== "") {
      const cid = Number(filterCategoryId);
      rows = rows.filter((r) => productIdToCategoryId.get(r.productId) === cid);
    }
    if (onlyCriticalStock) {
      rows = rows.filter((r) => r.currentStock <= r.minimumStock);
    }
    if (dateFrom) {
      const t = new Date(dateFrom).getTime();
      rows = rows.filter(
        (r) => new Date(r.modifiedAt ?? r.createdAt).getTime() >= t,
      );
    }
    if (dateTo) {
      const t = new Date(dateTo);
      t.setHours(23, 59, 59, 999);
      rows = rows.filter(
        (r) => new Date(r.modifiedAt ?? r.createdAt).getTime() <= t.getTime(),
      );
    }
    return rows;
  }, [
    loadedRows,
    debouncedFilterText,
    filterLocationId,
    filterCategoryId,
    onlyCriticalStock,
    dateFrom,
    dateTo,
    productIdToCategoryId,
  ]);

  const gridFiltersActive =
    filterText.trim() !== "" ||
    filterLocationId !== "" ||
    filterCategoryId !== "" ||
    onlyCriticalStock ||
    dateFrom !== "" ||
    dateTo !== "";

  const locationOptions = locationsLookup?.data ?? [];
  const defaultLoc = useDefaultLocation(locationOptions);

  useEffect(() => {
    if (filterLocationId !== "") return;
    if (defaultLoc.locationId != null) {
      setFilterLocationId(String(defaultLoc.locationId));
    }
  }, [defaultLoc.locationId, filterLocationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const inventoryCategoryName = useCallback(
    (row: InventoryResponse) => {
      const cid = productIdToCategoryId.get(row.productId);
      return categories.find((c) => c.id === cid)?.name ?? "—";
    },
    [categories, productIdToCategoryId],
  );

  const allPagesLoaded =
    result?.pagination != null && page >= (result.pagination.totalPages ?? 1);

  return (
    <DataTable
      gridConfig={{
        storageKey: "dashboard-inventory",
        exportFilenamePrefix: "inventario",
        primaryColumnKey: "productName",
        bulkEntityLabel: "registros",
      }}
      filters={
        <GridFilterBar onClear={clearGridFilters}>
          <div className="grid-filter-bar__field">
            <span className="grid-filter-bar__label">Producto</span>
            <input
              type="search"
              className={`grid-filter-bar__control grid-filter-bar__control--wide ${filterText.trim() ? "grid-filter-bar__control--active" : ""}`}
              placeholder="Nombre de producto…"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </div>
          <div className="grid-filter-bar__field">
            <span className="grid-filter-bar__label">Ubicación</span>
            <GridFilterSelect
              aria-label="Ubicación"
              value={filterLocationId}
              onChange={setFilterLocationId}
              active={filterLocationId !== ""}
              className="grid-filter-bar__control--medium"
              options={[
                { value: "", label: "Todas" },
                ...locationOptions.map((loc) => ({
                  value: String(loc.id),
                  label: loc.name,
                })),
              ]}
            />
          </div>
          {categories.length > 0 ? (
            <div className="grid-filter-bar__field">
              <span className="grid-filter-bar__label">Categoría</span>
              <GridFilterSelect
                aria-label="Categoría"
                value={filterCategoryId}
                onChange={setFilterCategoryId}
                active={filterCategoryId !== ""}
                className="grid-filter-bar__control--medium"
                options={[
                  { value: "", label: "Todas" },
                  ...categories.map((c) => ({
                    value: String(c.id),
                    label: c.name,
                  })),
                ]}
              />
            </div>
          ) : null}
          <div className="grid-filter-bar__field">
            <span
              className="grid-filter-bar__label grid-filter-bar__label--spacer"
              aria-hidden="true"
            >
              &nbsp;
            </span>
            <div className="grid-filter-bar__checkbox-row">
              <input
                id="inv-crit"
                type="checkbox"
                className="grid-filter-bar__checkbox"
                checked={onlyCriticalStock}
                onChange={(e) => setOnlyCriticalStock(e.target.checked)}
              />
              <label
                htmlFor="inv-crit"
                className="grid-filter-bar__checkbox-label"
              >
                Solo stock crítico
              </label>
            </div>
          </div>
          <div className="grid-filter-bar__field">
            <span className="grid-filter-bar__label">Actualizado desde</span>
            <DatePickerSimple
              date={dateFrom}
              setDate={setDateFrom}
              emptyLabel="Seleccionar"
              buttonClassName={`grid-filter-bar__date-trigger grid-filter-bar__control--medium ${dateFrom ? "grid-filter-bar__control--active" : ""}`}
            />
          </div>
          <div className="grid-filter-bar__field">
            <span className="grid-filter-bar__label">Hasta</span>
            <DatePickerSimple
              date={dateTo}
              setDate={setDateTo}
              emptyLabel="Seleccionar"
              buttonClassName={`grid-filter-bar__date-trigger grid-filter-bar__control--medium ${dateTo ? "grid-filter-bar__control--active" : ""}`}
            />
          </div>
        </GridFilterBar>
      }
      data={filteredData}
      columns={COLUMNS}
      loading={allRows.length === 0 && (isLoading || isFetching)}
      title="Inventario"
      titleIcon="inventory"
      emptyIcon="inventory"
      emptyTitle="Sin registros"
      emptyDesc={
        gridFiltersActive && loadedRows.length > 0
          ? "Ninguna fila coincide con los filtros."
          : "Stock por producto y ubicación. Las entradas y salidas se registran en Movimientos."
      }
      infiniteScroll
      hasMore={!allPagesLoaded}
      loadingMore={isFetching && !allPagesLoaded}
      detailDrawer={{
        entityLabelPlural: "registros",
        getTitle: (row) => {
          const r = row as InventoryResponse & { productName?: string };
          return r.productName?.trim() || `Inventario #${row.id}`;
        },
        getStatusBadge: () => (
          <span className="dt-tag dt-tag--green">Activo</span>
        ),
        render: (row) => (
          <InventoryDetailBody
            row={row}
            categoryName={inventoryCategoryName(row)}
          />
        ),
        showEditButton: false,
      }}
    />
  );
}
