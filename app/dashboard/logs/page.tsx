"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DataTableColumn } from "@/components/DataTable";
import { DataTable } from "@/components/DataTable";
import type { LogResponse } from "@/lib/dashboard-types";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import {
  SEARCH_TABLE_CHUNK_PAGE_SIZE,
  TABLE_SEARCH_DEBOUNCE_MS,
  useLoadAllRemainingPages,
} from "@/lib/useLoadAllRemainingPages";
import { useGetLogsQuery } from "./_service/logsApi";
import "../products/products-modal.css";
import { DatePickerSimple } from "@/components/DatePickerSimple";
import { GridFilterBar, GridFilterSelect } from "@/components/dashboard";
import { LogDetailBody } from "@/components/dashboard-detail/entityDetailBodies";
import { useGetUsersQuery } from "../users/_service/usersApi";

const COLUMNS: DataTableColumn<LogResponse>[] = [
  { key: "id", label: "ID", width: "60px" },
  { key: "logType", label: "Tipo" },
  { key: "eventType", label: "Evento" },
  { key: "description", label: "Descripción" },
  { key: "userId", label: "User", width: "70px" },
  { key: "createdAt", label: "Fecha", type: "date" },
];

function matchesActionKind(row: LogResponse, kind: string): boolean {
  if (!kind) return true;
  const d = `${row.description ?? ""} ${row.eventType ?? ""}`.toLowerCase();
  switch (kind) {
    case "create":
      return /cre|create|alta|insert|añad/i.test(d);
    case "edit":
      return /edit|update|modific|camb/i.test(d);
    case "delete":
      return /elimin|delete|baja|borr/i.test(d);
    case "login":
      return /login|auth|sesi|inicio|sesión/i.test(d);
    default:
      return true;
  }
}

export default function LogsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, _setPageSize] = useState(15);
  const [filterText, setFilterText] = useState("");
  const debouncedFilterText = useDebouncedValue(
    filterText,
    TABLE_SEARCH_DEBOUNCE_MS,
  );
  const [actionKind, setActionKind] = useState("");
  const [filterUserId, setFilterUserId] = useState("");
  const [logDateFrom, setLogDateFrom] = useState("");
  const [logDateTo, setLogDateTo] = useState("");
  const perPage = Math.max(pageSize, SEARCH_TABLE_CHUNK_PAGE_SIZE);
  const loadNextPage = useCallback(() => setPage((p) => p + 1), []);
  const filtersChanged = useRef(false);

  const {
    data: result,
    isLoading,
    isFetching,
  } = useGetLogsQuery({
    page,
    perPage,
    sortOrder: "desc",
  });

  const [allRows, setAllRows] = useState<LogResponse[]>([]);

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

  const { data: usersPage } = useGetUsersQuery({ page: 1, perPage: 500 });

  const userIdToName = useMemo(() => {
    const m = new Map<number, string>();
    for (const u of usersPage?.data ?? []) {
      m.set(u.id, u.fullName?.trim() || u.email?.trim() || String(u.id));
    }
    return m;
  }, [usersPage?.data]);

  const userIdsInData = useMemo(() => {
    const s = new Set<number>();
    for (const r of loadedRows) {
      if (r.userId != null && r.userId > 0) s.add(r.userId);
    }
    return [...s].sort((a, b) => a - b);
  }, [loadedRows]);

  const clearGridFilters = () => {
    setFilterText("");
    setActionKind("");
    setFilterUserId("");
    setLogDateFrom("");
    setLogDateTo("");
  };

  const filteredData = useMemo(() => {
    let rows = loadedRows;
    const q = debouncedFilterText.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) =>
          String(r.description ?? "")
            .toLowerCase()
            .includes(q) || String(r.userId ?? "").includes(q),
      );
    }
    if (actionKind) rows = rows.filter((r) => matchesActionKind(r, actionKind));
    if (filterUserId !== "") {
      const uid = Number(filterUserId);
      rows = rows.filter((r) => r.userId === uid);
    }
    if (logDateFrom) {
      const t = new Date(logDateFrom).getTime();
      rows = rows.filter((r) => new Date(r.createdAt).getTime() >= t);
    }
    if (logDateTo) {
      const t = new Date(logDateTo);
      t.setHours(23, 59, 59, 999);
      rows = rows.filter((r) => new Date(r.createdAt).getTime() <= t.getTime());
    }
    return rows;
  }, [
    loadedRows,
    debouncedFilterText,
    actionKind,
    filterUserId,
    logDateFrom,
    logDateTo,
  ]);

  const gridFiltersActive =
    filterText.trim() !== "" ||
    actionKind !== "" ||
    filterUserId !== "" ||
    logDateFrom !== "" ||
    logDateTo !== "";

  const allPagesLoaded =
    result?.pagination != null && page >= (result.pagination.totalPages ?? 1);

  const renderMobileLogRow = useCallback(
    (row: LogResponse) => {
      const lt = (row.logType ?? "").trim() || "—";
      const ev = (row.eventType ?? "").trim() || "—";
      const head = `${lt} · ${ev}`;
      const d = new Date(row.createdAt);
      const dateStr = Number.isNaN(d.getTime())
        ? ""
        : d.toLocaleString("es-MX", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
      const uid = row.userId;
      const userMeta =
        uid != null && uid > 0
          ? (userIdToName.get(uid) ?? `Usuario #${uid}`)
          : null;
      return (
        <div className="dt-mobile-row">
          <div className="dt-mobile-row__body">
            <div className="dt-mobile-row__title" title={head}>
              {head}
            </div>
            {userMeta ? (
              <div className="dt-mobile-row__meta" title={userMeta}>
                {userMeta}
              </div>
            ) : null}
          </div>
          {dateStr ? (
            <span
              className="dt-mobile-row__end"
              style={{ fontSize: "0.72rem", fontWeight: 600 }}
            >
              {dateStr}
            </span>
          ) : null}
        </div>
      );
    },
    [userIdToName],
  );

  return (
    <DataTable
      gridConfig={{
        storageKey: "dashboard-logs",
        exportFilenamePrefix: "logs",
        primaryColumnKey: "description",
        bulkEntityLabel: "registros",
      }}
      filters={
        <GridFilterBar onClear={clearGridFilters}>
          <div className="grid-filter-bar__field">
            <span className="grid-filter-bar__label">Buscar</span>
            <input
              type="search"
              className={`grid-filter-bar__control grid-filter-bar__control--wide ${filterText.trim() ? "grid-filter-bar__control--active" : ""}`}
              placeholder="Descripción, usuario…"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </div>
          <div className="grid-filter-bar__field">
            <span className="grid-filter-bar__label">Tipo de acción</span>
            <GridFilterSelect
              aria-label="Tipo de acción"
              value={actionKind}
              onChange={setActionKind}
              active={actionKind !== ""}
              className="grid-filter-bar__control--medium"
              options={[
                { value: "", label: "Todas" },
                { value: "create", label: "Creación" },
                { value: "edit", label: "Edición" },
                { value: "delete", label: "Eliminación" },
                { value: "login", label: "Login" },
              ]}
            />
          </div>
          {userIdsInData.length > 0 ? (
            <div className="grid-filter-bar__field">
              <span className="grid-filter-bar__label">Usuario</span>
              <GridFilterSelect
                aria-label="Usuario"
                value={filterUserId}
                onChange={setFilterUserId}
                active={filterUserId !== ""}
                className="grid-filter-bar__control--medium"
                options={[
                  { value: "", label: "Todos" },
                  ...userIdsInData.map((id) => ({
                    value: String(id),
                    label: userIdToName.get(id) ?? String(id),
                  })),
                ]}
              />
            </div>
          ) : null}
          <div className="grid-filter-bar__field">
            <span className="grid-filter-bar__label">Desde</span>
            <DatePickerSimple
              date={logDateFrom}
              setDate={setLogDateFrom}
              emptyLabel="Seleccionar"
              buttonClassName={`grid-filter-bar__date-trigger grid-filter-bar__control--medium ${logDateFrom ? "grid-filter-bar__control--active" : ""}`}
            />
          </div>
          <div className="grid-filter-bar__field">
            <span className="grid-filter-bar__label">Hasta</span>
            <DatePickerSimple
              date={logDateTo}
              setDate={setLogDateTo}
              emptyLabel="Seleccionar"
              buttonClassName={`grid-filter-bar__date-trigger grid-filter-bar__control--medium ${logDateTo ? "grid-filter-bar__control--active" : ""}`}
            />
          </div>
        </GridFilterBar>
      }
      data={filteredData}
      columns={COLUMNS}
      loading={allRows.length === 0 && (isLoading || isFetching)}
      title="Logs del sistema"
      titleIcon="receipt_long"
      infiniteScroll
      hasMore={!allPagesLoaded}
      loadingMore={isFetching && !allPagesLoaded}
      emptyIcon="receipt_long"
      emptyTitle="Sin registros"
      emptyDesc={
        gridFiltersActive && loadedRows.length > 0
          ? "Ningún log coincide con los filtros."
          : "No hay logs"
      }
      renderMobileRowSummary={renderMobileLogRow}
      detailDrawer={{
        entityLabelPlural: "registros",
        getTitle: (row) => `Log #${row.id}`,
        render: (row) => (
          <LogDetailBody
            row={row}
            userLabel={
              row.userId != null && row.userId > 0
                ? (userIdToName.get(row.userId) ?? String(row.userId))
                : "—"
            }
          />
        ),
        showEditButton: false,
      }}
    />
  );
}
