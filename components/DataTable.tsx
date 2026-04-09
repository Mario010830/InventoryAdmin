"use client";

import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { DefaultBulkToolbar } from "@/components/DataTableBulkToolbar";
import { GridDetailDrawer } from "@/components/GridDetailDrawer";
import { Icon } from "@/components/ui/Icon";
import { useDisplayCurrency } from "@/contexts/DisplayCurrencyContext";
import {
  loadHiddenColumnKeys,
  saveHiddenColumnKeys,
} from "@/lib/dataTableColumnStorage";
import type { FormatCupFn } from "@/lib/dataTableExport";
import {
  buildExportRows,
  downloadCsv,
  downloadXlsx,
  type ExportColumn,
  exportFilename,
} from "@/lib/dataTableExport";
import { cycleSort, type SortState, sortData } from "@/lib/dataTableSort";
import {
  computeInitialWidths,
  MIN_COL,
  measureColumnFit,
} from "./dataTableWidths";
import "./data-table.css";

const DT_LAYOUT_MOBILE_MAX_PX = 768;

/** Factor para achicar anchos en px en móvil (más columnas visibles sin scroll excesivo). */
const MOBILE_COL_SHRINK = 0.82;

const DEFAULT_MOBILE_TABLE_ZOOM = 0.78;
const MIN_MOBILE_TABLE_ZOOM = 0.55;
const MAX_MOBILE_TABLE_ZOOM = 1.15;
const MOBILE_TABLE_ZOOM_STEP = 0.05;

function clampMobileZoom(n: number) {
  return Math.min(
    MAX_MOBILE_TABLE_ZOOM,
    Math.max(MIN_MOBILE_TABLE_ZOOM, Math.round(n * 100) / 100),
  );
}

function useMatchMaxWidth(maxWidthPx: number) {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(`(max-width: ${maxWidthPx}px)`);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(`(max-width: ${maxWidthPx}px)`).matches,
    () => false,
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ColumnType =
  | "text"
  | "number"
  | "currency"
  | "date"
  | "boolean"
  | "custom";

export interface DataTableColumn<T = Record<string, unknown>> {
  key: string | ((row: T) => string | number);
  label: string;
  type?: ColumnType;
  width?: string;
  locale?: string;
  currency?: string;
  booleanLabels?: { true: string; false: string };
  render?: (row: T) => React.ReactNode;
  /** Por defecto true si la grilla tiene ordenación */
  sortable?: boolean;
  sortValue?: (row: T) => unknown;
  exportValue?: (row: T) => string;
  /** Por defecto true */
  exportable?: boolean;
  /** Leyenda en cabecera (ej. columna Margen); se muestra al pasar el ratón por el icono ℹ️ */
  headerTooltip?: React.ReactNode;
}

export interface DataTableAction<T = Record<string, unknown>> {
  icon: string;
  label: string;
  onClick: (row: T) => void;
  variant?: "default" | "danger";
  hidden?: (row: T) => boolean;
  disabled?: (row: T) => boolean;
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface DataTableGridConfig {
  /** Igual que columnWidthsStorageKey; también persiste visibilidad de columnas */
  storageKey: string;
  exportFilenamePrefix: string;
  /** Columna que no se puede ocultar (identificador principal) */
  primaryColumnKey: string;
  /** Texto en barra masiva: "elementos" por defecto */
  bulkEntityLabel?: string;
}

export interface DataTableProps<T extends { id: string | number }> {
  data: T[];
  columns: DataTableColumn<T>[];
  loading?: boolean;
  title: string;
  titleIcon?: string;
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  addLabel?: string;
  addIcon?: string;
  onAdd?: () => void;
  addDisabled?: boolean;
  addButtonDataTutorial?: string;
  toolbarExtra?: React.ReactNode;
  actions?: DataTableAction<T>[];
  pagination?: PaginationMeta;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  infiniteScroll?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  emptyIcon?: string;
  emptyTitle?: string;
  emptyDesc?: string;
  filters?: React.ReactNode;
  /** Clave única por pantalla para persistir anchos en localStorage */
  columnWidthsStorageKey?: string;
  /** Panel lateral de solo lectura: clic en fila + icono ojo en acciones */
  detailDrawer?: DataTableDetailDrawerConfig<T>;
  /** Ordenación, selección, export, columnas visibles */
  gridConfig?: DataTableGridConfig;
  renderBulkToolbar?: (ctx: {
    selectedIds: number[];
    selectedRows: T[];
    clearSelection: () => void;
    count: number;
    exportSelectedCsv: () => void;
    exportSelectedXlsx: () => void;
  }) => React.ReactNode;
  onBulkDeleteSelected?: (ids: number[]) => void | Promise<void>;
  /**
   * Con scroll infinito y aún hay más páginas en el servidor: antes de marcar «todas» las filas
   * visibles, se puede cargar el resto y devolver los ids a seleccionar (p. ej. filas que pasan el filtro).
   */
  onBulkSelectAll?: () => Promise<string[] | undefined>;
}

export interface DataTableDetailDrawerConfig<T> {
  /** Texto del contador, ej. "productos", "movimientos" */
  entityLabelPlural: string;
  render: (row: T) => React.ReactNode;
  getTitle: (row: T) => string;
  getStatusBadge?: (row: T) => React.ReactNode;
  onEdit?: (row: T) => void;
  /** Por defecto true si existe onEdit */
  showEditButton?: boolean | ((row: T) => boolean);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getNestedValue(row: object, key: string): unknown {
  return key
    .split(".")
    .reduce((obj: unknown, k) => (obj as Record<string, unknown>)?.[k], row);
}

function resolveValue<T extends object>(
  row: T,
  key: string | ((row: T) => string | number),
): unknown {
  if (typeof key === "function") return key(row);
  return getNestedValue(row, key);
}

function resolveColKey<T>(
  col: { key: string | ((row: T) => string | number) },
  index: number,
): string {
  if (typeof col.key === "string") return col.key;
  return `col-${index}`;
}

function formatDate(iso: string, locale = "es-ES") {
  try {
    return new Date(iso).toLocaleDateString(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatCurrencyCell(
  n: number,
  locale = "es-ES",
  currency: string | undefined,
  formatCup: FormatCupFn,
) {
  if (currency != null && currency !== "CUP") {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  }
  return formatCup(n);
}

function getPageNumbers(
  current: number,
  total: number,
  maxVisible = 5,
): number[] {
  if (total <= maxVisible)
    return Array.from({ length: total }, (_, i) => i + 1);
  let start = Math.max(1, current - Math.floor(maxVisible / 2));
  let end = start + maxVisible - 1;
  if (end > total) {
    end = total;
    start = Math.max(1, end - maxVisible + 1);
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

// ─── Cell ─────────────────────────────────────────────────────────────────────

function Cell<T extends object>({
  col,
  row,
  formatCup,
}: {
  col: DataTableColumn<T>;
  row: T;
  formatCup: FormatCupFn;
}) {
  if (col.render) return <>{col.render(row)}</>;

  const val = resolveValue(row, col.key);

  switch (col.type) {
    case "boolean": {
      const labels = col.booleanLabels ?? { true: "Activo", false: "Inactivo" };
      return (
        <span className={`dt-tag ${val ? "dt-tag--green" : "dt-tag--red"}`}>
          {val ? labels.true : labels.false}
        </span>
      );
    }
    case "date":
      return <span>{formatDate(String(val ?? ""), col.locale)}</span>;
    case "currency":
      return (
        <span className="dt-cell-mono">
          {formatCurrencyCell(
            Number(val ?? 0),
            col.locale,
            col.currency,
            formatCup,
          )}
        </span>
      );
    default:
      return (
        <span className="dt-cell-clamp">{val != null ? String(val) : "—"}</span>
      );
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

const PAGE_SIZES_DEFAULT = [5, 10, 25, 50];

export function DataTable<T extends { id: string | number }>({
  data,
  columns,
  loading = false,
  title,
  titleIcon,
  searchTerm = "",
  onSearchChange,
  searchPlaceholder = "Buscar...",
  addLabel,
  addIcon = "add",
  onAdd,
  addDisabled = false,
  addButtonDataTutorial,
  toolbarExtra,
  actions,
  pagination,
  pageSize = 10,
  pageSizeOptions = PAGE_SIZES_DEFAULT,
  onPageChange,
  onPageSizeChange,
  infiniteScroll,
  onLoadMore,
  hasMore = false,
  loadingMore = false,
  emptyIcon = "table_rows",
  emptyTitle = "Sin registros",
  emptyDesc,
  filters,
  columnWidthsStorageKey,
  detailDrawer,
  gridConfig,
  renderBulkToolbar,
  onBulkDeleteSelected,
  onBulkSelectAll,
}: DataTableProps<T>) {
  const { formatCup } = useDisplayCurrency();
  const gridEnabled = Boolean(gridConfig);
  const hasCheckbox = gridEnabled;

  const [detailIndex, setDetailIndex] = useState<number | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [sortState, setSortState] = useState<SortState>({
    key: null,
    dir: null,
  });
  const [hiddenColKeys, setHiddenColKeys] = useState<Set<string>>(
    () => new Set(),
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const columnsMenuRef = useRef<HTMLDivElement>(null);
  const headerSelectRef = useRef<HTMLInputElement>(null);

  const sortedData = useMemo(
    () => sortData(data, columns, sortState.key, sortState.dir, resolveColKey),
    [data, columns, sortState],
  );

  useEffect(() => {
    if (!gridConfig?.storageKey) return;
    setHiddenColKeys(loadHiddenColumnKeys(gridConfig.storageKey));
  }, [gridConfig?.storageKey]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (exportMenuRef.current?.contains(t)) return;
      if (columnsMenuRef.current?.contains(t)) return;
      setExportMenuOpen(false);
      setColumnsMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const mergedActions = useMemo(() => {
    if (!detailDrawer) return actions;
    const viewDetail: DataTableAction<T> = {
      icon: "visibility",
      label: "Ver detalle",
      onClick: (row) => {
        const i = sortedData.findIndex((r) => r.id === row.id);
        if (i >= 0) setDetailIndex(i);
      },
    };
    return [viewDetail, ...(actions ?? [])];
  }, [detailDrawer, actions, sortedData]);

  const hasActions = Boolean(mergedActions && mergedActions.length > 0);
  const hasHeadActions = Boolean(
    onSearchChange || addLabel || toolbarExtra || gridEnabled,
  );
  const sentinelRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    index: number;
    startX: number;
    startW: number;
  } | null>(null);

  const expectedColCount =
    (hasCheckbox ? 1 : 0) + columns.length + (hasActions ? 1 : 0);

  const [colWidths, setColWidths] = useState<number[]>(() =>
    computeInitialWidths(columns, { hasCheckbox, hasActions }),
  );
  /** Reparto proporcional para que la tabla no supere el 100% del contenedor (evita scroll horizontal). */
  const colWidthPct = useMemo(() => {
    const sum = colWidths.reduce((a, b) => a + b, 0);
    if (sum <= 0) {
      const n = Math.max(colWidths.length, 1);
      return colWidths.map(() => 100 / n);
    }
    return colWidths.map((w) => (w / sum) * 100);
  }, [colWidths]);
  const isMobileLayout = useMatchMaxWidth(DT_LAYOUT_MOBILE_MAX_PX);

  const widthStorageKey = columnWidthsStorageKey ?? gridConfig?.storageKey;

  const [mobileTableZoom, setMobileTableZoom] = useState(
    DEFAULT_MOBILE_TABLE_ZOOM,
  );

  useEffect(() => {
    if (!widthStorageKey || typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(`dt-mobile-zoom:${widthStorageKey}`);
      if (raw) {
        const n = Number.parseFloat(raw);
        if (!Number.isNaN(n)) setMobileTableZoom(clampMobileZoom(n));
      }
    } catch {
      /* ignore */
    }
  }, [widthStorageKey]);

  useEffect(() => {
    if (!widthStorageKey || typeof window === "undefined") return;
    try {
      sessionStorage.setItem(
        `dt-mobile-zoom:${widthStorageKey}`,
        String(mobileTableZoom),
      );
    } catch {
      /* ignore */
    }
  }, [widthStorageKey, mobileTableZoom]);

  const getColStyle = useCallback(
    (physicalIdx: number): CSSProperties => {
      if (isMobileLayout) {
        const base = colWidths[physicalIdx] ?? MIN_COL;
        const w = Math.max(MIN_COL, Math.round(base * MOBILE_COL_SHRINK));
        return { width: w, minWidth: w, maxWidth: "none" };
      }
      return {
        width: `${colWidthPct[physicalIdx] ?? 0}%`,
        minWidth: 0,
        maxWidth: "none",
      };
    },
    [isMobileLayout, colWidths, colWidthPct],
  );

  const [guide, setGuide] = useState<{
    left: number;
    top: number;
    height: number;
  } | null>(null);

  const primaryColumnKey = gridConfig?.primaryColumnKey ?? "";

  const isColumnLocked = useCallback(
    (colKey: string) => colKey === primaryColumnKey,
    [primaryColumnKey],
  );

  const toggleColumnHidden = useCallback(
    (colKey: string) => {
      if (!gridConfig?.storageKey || isColumnLocked(colKey)) return;
      setHiddenColKeys((prev) => {
        const next = new Set(prev);
        if (next.has(colKey)) next.delete(colKey);
        else next.add(colKey);
        saveHiddenColumnKeys(gridConfig.storageKey, next);
        return next;
      });
    },
    [gridConfig?.storageKey, isColumnLocked],
  );

  const restoreAllColumns = useCallback(() => {
    if (!gridConfig?.storageKey) return;
    setHiddenColKeys(new Set());
    saveHiddenColumnKeys(gridConfig.storageKey, new Set());
  }, [gridConfig?.storageKey]);

  const toggleableColumnEntries = useMemo(
    () =>
      columns
        .map((col, i) => ({ col, key: resolveColKey(col, i) }))
        .filter(({ key }) => !isColumnLocked(key)),
    [columns, isColumnLocked],
  );

  const lockedColumnFooterItems = useMemo(() => {
    const items: { key: string; label: string }[] = [];
    if (primaryColumnKey) {
      const primaryCol = columns.find(
        (c, i) => resolveColKey(c, i) === primaryColumnKey,
      );
      if (primaryCol) {
        items.push({
          key: `__locked__${primaryColumnKey}`,
          label: primaryCol.label,
        });
      }
    }
    if (hasActions) {
      items.push({ key: "__locked__actions", label: "Acciones" });
    }
    return items;
  }, [columns, primaryColumnKey, hasActions]);

  const hiddenColumnBadgeCount = useMemo(() => {
    const allowed = new Set(toggleableColumnEntries.map((e) => e.key));
    let n = 0;
    for (const k of hiddenColKeys) {
      if (allowed.has(k)) n += 1;
    }
    return n;
  }, [hiddenColKeys, toggleableColumnEntries]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const selectedRows = useMemo(
    () => sortedData.filter((r) => selectedIds.has(String(r.id))),
    [sortedData, selectedIds],
  );

  const selectedNumericIds = useMemo(
    () =>
      selectedRows.map((r) => Number(r.id)).filter((id) => !Number.isNaN(id)),
    [selectedRows],
  );

  useEffect(() => {
    const el = headerSelectRef.current;
    if (!el || !hasCheckbox) return;
    const n = sortedData.length;
    const sel = selectedIds.size;
    el.indeterminate = sel > 0 && sel < n;
  }, [hasCheckbox, sortedData.length, selectedIds.size]);

  const toggleRowSelected = useCallback((id: string | number) => {
    const k = String(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    void (async () => {
      if (sortedData.length === 0) {
        setSelectedIds(new Set());
        return;
      }
      const allVisibleSelected =
        selectedIds.size === sortedData.length &&
        sortedData.every((r) => selectedIds.has(String(r.id)));
      if (allVisibleSelected) {
        setSelectedIds(new Set());
        return;
      }
      if (gridEnabled && infiniteScroll && hasMore && onBulkSelectAll) {
        const ids = await onBulkSelectAll();
        if (ids != null) {
          setSelectedIds(new Set(ids.map(String)));
          return;
        }
      }
      setSelectedIds(new Set(sortedData.map((r) => String(r.id))));
    })();
  }, [
    sortedData,
    selectedIds,
    gridEnabled,
    infiniteScroll,
    hasMore,
    onBulkSelectAll,
  ]);

  const runExport = useCallback(
    async (format: "csv" | "xlsx") => {
      if (!gridConfig) return;
      const exportCols = columns.filter((c, i) => {
        const k = resolveColKey(c, i);
        if (hiddenColKeys.has(k)) return false;
        if (c.exportable === false) return false;
        return true;
      }) as ExportColumn<T>[];
      const rowsForExport =
        selectedIds.size > 0
          ? sortedData.filter((r) => selectedIds.has(String(r.id)))
          : sortedData;
      const { headers, lines } = buildExportRows(
        rowsForExport,
        exportCols,
        formatCup,
      );
      const fn = exportFilename(gridConfig.exportFilenamePrefix, format);
      if (format === "csv") downloadCsv(fn, headers, lines);
      else await downloadXlsx(fn, headers, lines);
      setExportMenuOpen(false);
    },
    [gridConfig, columns, hiddenColKeys, selectedIds, sortedData, formatCup],
  );

  useEffect(() => {
    if (detailIndex === null) {
      setDetailPanelOpen(false);
      return;
    }
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setDetailPanelOpen(true));
    });
    return () => cancelAnimationFrame(id);
  }, [detailIndex]);

  useEffect(() => {
    if (detailIndex == null || sortedData.length === 0) return;
    if (detailIndex >= sortedData.length) {
      setDetailIndex(sortedData.length - 1);
    }
  }, [sortedData.length, detailIndex]);

  const closeDetailDrawer = useCallback(() => {
    setDetailPanelOpen(false);
    window.setTimeout(() => setDetailIndex(null), 280);
  }, []);

  const openDetailAtIndex = useCallback(
    (idx: number) => {
      if (idx >= 0 && idx < sortedData.length) setDetailIndex(idx);
    },
    [sortedData.length],
  );

  useEffect(() => {
    const fb = computeInitialWidths(columns, { hasCheckbox, hasActions });
    if (!widthStorageKey) {
      setColWidths(fb);
      return;
    }
    try {
      const raw = localStorage.getItem(`dt-col-widths:${widthStorageKey}`);
      if (raw) {
        const parsed = JSON.parse(raw) as number[];
        if (Array.isArray(parsed) && parsed.length === expectedColCount) {
          setColWidths(parsed.map((w) => Math.max(MIN_COL, w)));
          return;
        }
      }
    } catch {
      /* ignore */
    }
    setColWidths(fb);
  }, [widthStorageKey, expectedColCount, hasCheckbox, hasActions, columns]);

  const persistWidths = useCallback(
    (widths: number[]) => {
      if (!widthStorageKey) return;
      try {
        localStorage.setItem(
          `dt-col-widths:${widthStorageKey}`,
          JSON.stringify(widths),
        );
      } catch {
        /* ignore */
      }
    },
    [widthStorageKey],
  );

  const updateGuide = useCallback((clientX: number) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const r = wrap.getBoundingClientRect();
    setGuide({
      left: clientX - r.left + wrap.scrollLeft,
      top: 0,
      height: wrap.clientHeight,
    });
  }, []);

  const onResizeStart = useCallback(
    (e: React.MouseEvent, colIndex: number) => {
      e.preventDefault();
      e.stopPropagation();
      const w = colWidths[colIndex] ?? MIN_COL;
      dragRef.current = { index: colIndex, startX: e.clientX, startW: w };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      updateGuide(e.clientX);
    },
    [colWidths, updateGuide],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const nextW = Math.max(MIN_COL, d.startW + (e.clientX - d.startX));
      setColWidths((prev) => {
        const next = [...prev];
        next[d.index] = nextW;
        return next;
      });
      updateGuide(e.clientX);
    };
    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      setGuide(null);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
      setColWidths((prev) => {
        persistWidths(prev);
        return prev;
      });
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [persistWidths, updateGuide]);

  const onResizeDoubleClick = useCallback(
    (e: React.MouseEvent, colIndex: number) => {
      e.preventDefault();
      e.stopPropagation();
      const table = tableRef.current;
      if (!table) return;
      const current = colWidths[colIndex] ?? MIN_COL;
      requestAnimationFrame(() => {
        const w = measureColumnFit(table, colIndex, current);
        setColWidths((prev) => {
          const next = [...prev];
          next[colIndex] = w;
          persistWidths(next);
          return next;
        });
      });
    },
    [persistWidths, colWidths],
  );

  useEffect(() => {
    if (!infiniteScroll || !onLoadMore) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          onLoadMore();
        }
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: 0,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [infiniteScroll, onLoadMore, hasMore, loadingMore]);

  const rangeStart = pagination
    ? (pagination.currentPage - 1) * pagination.pageSize + 1
    : 0;
  const rangeEnd = pagination
    ? Math.min(
        pagination.currentPage * pagination.pageSize,
        pagination.totalCount,
      )
    : 0;

  const showBulkBar = hasCheckbox && selectedIds.size > 0;
  const wrapClass =
    filters != null || showBulkBar
      ? "dt-wrap dt-wrap--after-filters"
      : "dt-wrap";

  const detailRow = detailIndex != null ? sortedData[detailIndex] : null;

  return (
    <>
      <div className="dt-card">
        <div className="dt-card-head">
          <h1 className="dt-header__title">
            {titleIcon && <Icon name={titleIcon} />}
            {title}
          </h1>
          {hasHeadActions ? (
            <div className="dt-card-head__actions">
              {onSearchChange && (
                <div className="dt-toolbar__search">
                  <Icon name="search" />
                  <input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                  />
                </div>
              )}
              {toolbarExtra}
              {gridEnabled && (
                <>
                  <div className="dt-toolbar-dropdown" ref={columnsMenuRef}>
                    <button
                      type="button"
                      className="dt-btn-ghost dt-btn-ghost--columns"
                      onClick={() => {
                        setColumnsMenuOpen((o) => !o);
                        setExportMenuOpen(false);
                      }}
                    >
                      <Icon name="view_column" />
                      <span className="dt-btn-ghost__label">Columnas</span>
                      {hiddenColumnBadgeCount > 0 ? (
                        <span
                          className="dt-btn-ghost__badge"
                          aria-label={`${hiddenColumnBadgeCount} columnas ocultas`}
                        >
                          · {hiddenColumnBadgeCount}
                        </span>
                      ) : null}
                    </button>
                    {columnsMenuOpen ? (
                      <div
                        className={`dt-column-picker${toggleableColumnEntries.length >= 8 ? " dt-column-picker--wide" : ""}`}
                        role="menu"
                      >
                        <div className="dt-column-picker__title">
                          Columnas visibles
                        </div>
                        <div
                          className={`dt-column-picker__grid${toggleableColumnEntries.length >= 8 ? " dt-column-picker__grid--two" : ""}`}
                        >
                          {toggleableColumnEntries.map(({ col, key: k }) => {
                            const hidden = hiddenColKeys.has(k);
                            return (
                              <label key={k} className="dt-column-picker__row">
                                <input
                                  type="checkbox"
                                  className="dt-column-picker__checkbox"
                                  checked={!hidden}
                                  onChange={() => toggleColumnHidden(k)}
                                />
                                <span className="dt-column-picker__name">
                                  {col.label}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        {lockedColumnFooterItems.length > 0 ? (
                          <>
                            <div className="dt-column-picker__divider" />
                            <div className="dt-column-picker__locked">
                              {lockedColumnFooterItems.map((item) => (
                                <div
                                  key={item.key}
                                  className="dt-column-picker__locked-row"
                                >
                                  <Icon
                                    name="lock"
                                    className="dt-column-picker__lock-icon"
                                  />
                                  <span className="dt-column-picker__locked-label">
                                    {item.label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : null}
                        <button
                          type="button"
                          className="dt-column-picker__restore"
                          onClick={() => {
                            restoreAllColumns();
                          }}
                        >
                          Restaurar todo
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <div className="dt-toolbar-dropdown" ref={exportMenuRef}>
                    <button
                      type="button"
                      className="dt-btn-ghost"
                      onClick={() => {
                        setExportMenuOpen((o) => !o);
                        setColumnsMenuOpen(false);
                      }}
                    >
                      <Icon name="download" />
                      Exportar
                    </button>
                    {exportMenuOpen ? (
                      <div
                        className="dt-dropdown-panel dt-dropdown-panel--narrow"
                        role="menu"
                      >
                        <button
                          type="button"
                          className="dt-dropdown-item"
                          onClick={() => void runExport("csv")}
                        >
                          Exportar CSV
                        </button>
                        <button
                          type="button"
                          className="dt-dropdown-item"
                          onClick={() => void runExport("xlsx")}
                        >
                          Exportar Excel (.xlsx)
                        </button>
                      </div>
                    ) : null}
                  </div>
                </>
              )}
              {addLabel && (
                <button
                  type="button"
                  className="dt-btn-add"
                  disabled={addDisabled}
                  onClick={() => !addDisabled && onAdd?.()}
                  data-tutorial={addButtonDataTutorial}
                  title={addDisabled ? "Sin permiso para crear" : undefined}
                >
                  <Icon name={addIcon} />
                  {addLabel}
                </button>
              )}
            </div>
          ) : null}
        </div>

        {filters != null || showBulkBar ? (
          <>
            <div className="dt-card-divider" role="presentation" />
            {showBulkBar ? (
              <div className="dt-bulk-bar">
                {renderBulkToolbar ? (
                  renderBulkToolbar({
                    selectedIds: selectedNumericIds,
                    selectedRows,
                    clearSelection,
                    count: selectedIds.size,
                    exportSelectedCsv: () => void runExport("csv"),
                    exportSelectedXlsx: () => void runExport("xlsx"),
                  })
                ) : (
                  <DefaultBulkToolbar
                    count={selectedIds.size}
                    entityLabel={gridConfig?.bulkEntityLabel ?? "elementos"}
                    onClear={clearSelection}
                    onExportSelectedCsv={() => void runExport("csv")}
                    onExportSelectedXlsx={() => void runExport("xlsx")}
                    onDeleteSelected={
                      onBulkDeleteSelected
                        ? () => void onBulkDeleteSelected(selectedNumericIds)
                        : undefined
                    }
                    showDelete={Boolean(onBulkDeleteSelected)}
                  />
                )}
              </div>
            ) : (
              filters != null && (
                <div className="dt-card-filters">{filters}</div>
              )
            )}
            <div className="dt-card-divider" role="presentation" />
          </>
        ) : null}

        {loading ? (
          <div className="dt-state">
            <div className="dt-state__spinner" />
            <span>Cargando datos...</span>
          </div>
        ) : data.length === 0 ? (
          <div className="dt-state dt-state--empty">
            <div className="dt-state__icon-box">
              <Icon name={emptyIcon} />
            </div>
            <p className="dt-state__title">{emptyTitle}</p>
            {emptyDesc && <p className="dt-state__desc">{emptyDesc}</p>}
            {addLabel && (
              <button
                type="button"
                className="dt-btn-add"
                disabled={addDisabled}
                onClick={() => !addDisabled && onAdd?.()}
                title={addDisabled ? "Sin permiso para crear" : undefined}
              >
                <Icon name={addIcon} />
                {addLabel}
              </button>
            )}
          </div>
        ) : (
          <>
            <div ref={wrapRef} className={wrapClass}>
              {guide ? (
                <div
                  className="dt-resize-guide"
                  style={{
                    left: guide.left,
                    top: guide.top,
                    height: guide.height,
                  }}
                  aria-hidden
                />
              ) : null}
              {isMobileLayout ? (
                <div
                  className="dt-mobile-zoom-bar"
                  role="toolbar"
                  aria-label="Zoom de la tabla"
                >
                  <span className="dt-mobile-zoom-bar__label">Tabla</span>
                  <button
                    type="button"
                    className="dt-mobile-zoom-btn"
                    aria-label="Alejar tabla"
                    onClick={() =>
                      setMobileTableZoom((z) =>
                        clampMobileZoom(z - MOBILE_TABLE_ZOOM_STEP),
                      )
                    }
                  >
                    −
                  </button>
                  <span
                    className="dt-mobile-zoom-bar__value"
                    aria-live="polite"
                  >
                    {Math.round(mobileTableZoom * 100)}%
                  </span>
                  <button
                    type="button"
                    className="dt-mobile-zoom-btn"
                    aria-label="Acercar tabla"
                    onClick={() =>
                      setMobileTableZoom((z) =>
                        clampMobileZoom(z + MOBILE_TABLE_ZOOM_STEP),
                      )
                    }
                  >
                    +
                  </button>
                  <button
                    type="button"
                    className="dt-mobile-zoom-btn dt-mobile-zoom-btn--reset"
                    title="Tamaño predeterminado (más filas visibles)"
                    aria-label="Restablecer zoom de la tabla"
                    onClick={() =>
                      setMobileTableZoom(DEFAULT_MOBILE_TABLE_ZOOM)
                    }
                  >
                    Predet.
                  </button>
                </div>
              ) : null}
              <div
                className={isMobileLayout ? "dt-mobile-zoom-inner" : undefined}
                style={
                  isMobileLayout
                    ? ({ zoom: mobileTableZoom } as CSSProperties)
                    : undefined
                }
              >
                <table
                  ref={tableRef}
                  className={`dt-table${isMobileLayout ? " dt-table--mobile" : ""}`}
                  style={
                    isMobileLayout
                      ? { width: "max-content", minWidth: "100%" }
                      : undefined
                  }
                >
                  <thead>
                    <tr>
                      {hasCheckbox ? (
                        <th
                          className="dt-th dt-th-checkbox"
                          style={getColStyle(0)}
                        >
                          <input
                            ref={headerSelectRef}
                            type="checkbox"
                            className="dt-row-checkbox"
                            checked={
                              sortedData.length > 0 &&
                              selectedIds.size === sortedData.length
                            }
                            onChange={toggleSelectAll}
                            aria-label="Seleccionar todas las filas"
                          />
                        </th>
                      ) : null}
                      {columns.map((col, colIdx) => {
                        const colKey = resolveColKey(col, colIdx);
                        const hidden = hiddenColKeys.has(colKey);
                        const physicalIdx = colIdx + (hasCheckbox ? 1 : 0);
                        const sortable = gridEnabled && col.sortable !== false;
                        return (
                          <th
                            key={colKey}
                            className={`dt-th${hidden ? " dt-col-hidden" : ""}`}
                            style={getColStyle(physicalIdx)}
                          >
                            <div className="dt-th-inner">
                              <button
                                type="button"
                                className={`dt-th-sort${sortable ? "" : " dt-th-sort--static"}`}
                                onClick={() =>
                                  sortable &&
                                  setSortState((p) => cycleSort(p, colKey))
                                }
                                disabled={!sortable}
                              >
                                <span className="dt-th-label">{col.label}</span>
                                {sortable ? (
                                  <span className="dt-sort-icons" aria-hidden>
                                    {sortState.key === colKey &&
                                    sortState.dir === "asc" ? (
                                      <Icon
                                        name="arrow_upward"
                                        className="dt-sort-icon dt-sort-icon--on"
                                      />
                                    ) : sortState.key === colKey &&
                                      sortState.dir === "desc" ? (
                                      <Icon
                                        name="arrow_downward"
                                        className="dt-sort-icon dt-sort-icon--on"
                                      />
                                    ) : (
                                      <Icon
                                        name="unfold_more"
                                        className="dt-sort-icon dt-sort-icon--muted"
                                      />
                                    )}
                                  </span>
                                ) : null}
                              </button>
                              {col.headerTooltip != null ? (
                                <span className="dt-th-hint">
                                  <button
                                    type="button"
                                    className="dt-th-hint__trigger"
                                    tabIndex={0}
                                    aria-label="Ver leyenda de la columna"
                                  >
                                    <Icon name="info" />
                                  </button>
                                  <div
                                    className="dt-th-hint__popover"
                                    role="tooltip"
                                  >
                                    {col.headerTooltip}
                                  </div>
                                </span>
                              ) : null}
                            </div>
                            <span
                              role="separator"
                              aria-orientation="vertical"
                              aria-hidden
                              className="dt-resize-handle"
                              onMouseDown={(e) => onResizeStart(e, physicalIdx)}
                              onDoubleClick={(e) =>
                                onResizeDoubleClick(e, physicalIdx)
                              }
                            />
                          </th>
                        );
                      })}
                      {hasActions && (
                        <th
                          className="dt-th dt-th-actions"
                          style={getColStyle(
                            columns.length + (hasCheckbox ? 1 : 0),
                          )}
                        >
                          <span className="dt-th-label">Acciones</span>
                          <span
                            role="separator"
                            aria-hidden
                            className="dt-resize-handle"
                            onMouseDown={(e) =>
                              onResizeStart(
                                e,
                                columns.length + (hasCheckbox ? 1 : 0),
                              )
                            }
                            onDoubleClick={(e) =>
                              onResizeDoubleClick(
                                e,
                                columns.length + (hasCheckbox ? 1 : 0),
                              )
                            }
                          />
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedData.map((row, idx) => (
                      <tr
                        key={row.id}
                        className={`${idx % 2 === 1 ? "dt-row-alt" : ""}${detailDrawer ? " dt-row-clickable" : ""}`.trim()}
                        onClick={
                          detailDrawer
                            ? () => openDetailAtIndex(idx)
                            : undefined
                        }
                      >
                        {hasCheckbox ? (
                          <td
                            className="dt-td-checkbox"
                            onClick={(e) => e.stopPropagation()}
                            style={getColStyle(0)}
                          >
                            <input
                              type="checkbox"
                              className="dt-row-checkbox"
                              checked={selectedIds.has(String(row.id))}
                              onChange={() => toggleRowSelected(row.id)}
                              aria-label="Seleccionar fila"
                            />
                          </td>
                        ) : null}
                        {columns.map((col, colIdx) => {
                          const colKey = resolveColKey(col, colIdx);
                          const hidden = hiddenColKeys.has(colKey);
                          const physicalIdx = colIdx + (hasCheckbox ? 1 : 0);
                          return (
                            <td
                              key={colKey}
                              className={hidden ? "dt-col-hidden" : undefined}
                              style={getColStyle(physicalIdx)}
                            >
                              <Cell col={col} row={row} formatCup={formatCup} />
                            </td>
                          );
                        })}
                        {hasActions && (
                          <td
                            className="dt-td-actions"
                            style={getColStyle(
                              columns.length + (hasCheckbox ? 1 : 0),
                            )}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {mergedActions?.map((action, actionIdx) => {
                              if (action.hidden?.(row)) return null;
                              return (
                                <button
                                  key={`${actionIdx}-${action.label}`}
                                  type="button"
                                  className={`dt-icon-btn${action.variant === "danger" ? " dt-icon-btn--danger" : ""}${action.disabled?.(row) ? " dt-icon-btn--disabled" : ""}`}
                                  onClick={() => {
                                    if (!action.disabled?.(row))
                                      action.onClick(row);
                                  }}
                                  title={action.label}
                                  disabled={action.disabled?.(row)}
                                >
                                  <Icon name={action.icon} />
                                </button>
                              );
                            })}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {infiniteScroll ? (
              <>
                {loadingMore && (
                  <div className="dt-load-more">
                    <div className="dt-state__spinner" />
                    <span>Cargando más...</span>
                  </div>
                )}
                {!hasMore && data.length > 0 && (
                  <div className="dt-end-msg">— Fin de los registros —</div>
                )}
                <div
                  ref={sentinelRef}
                  style={{ height: "20px", width: "100%" }}
                />
              </>
            ) : pagination ? (
              <div className="dt-footer">
                <div className="dt-footer__left">
                  <span>Filas por página</span>
                  <select
                    className="dt-footer-select"
                    value={pageSize}
                    onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
                  >
                    {pageSizeOptions.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="dt-footer__center">
                  <button
                    type="button"
                    className="dt-pg-btn"
                    disabled={!pagination.hasPreviousPage}
                    onClick={() => onPageChange?.(pagination.currentPage - 1)}
                  >
                    <Icon name="chevron_left" />
                    Anterior
                  </button>
                  {getPageNumbers(
                    pagination.currentPage,
                    pagination.totalPages,
                  ).map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`dt-pg-num${p === pagination.currentPage ? " dt-pg-num--on" : ""}`}
                      onClick={() => onPageChange?.(p)}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="dt-pg-btn"
                    disabled={!pagination.hasNextPage}
                    onClick={() => onPageChange?.(pagination.currentPage + 1)}
                  >
                    Próximo
                    <Icon name="chevron_right" />
                  </button>
                </div>
                <div className="dt-footer__right">
                  Mostrando {rangeStart}–{rangeEnd} de {pagination.totalCount}{" "}
                  registros
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>

      {detailDrawer && detailRow != null && detailIndex != null && (
        <GridDetailDrawer
          open={detailPanelOpen}
          onClose={closeDetailDrawer}
          title={detailDrawer.getTitle(detailRow)}
          statusBadge={detailDrawer.getStatusBadge?.(detailRow)}
          currentPosition={detailIndex + 1}
          total={sortedData.length}
          entityLabelPlural={detailDrawer.entityLabelPlural}
          onPrev={() => {
            setDetailIndex((i) => (i == null || i <= 0 ? i : i - 1));
          }}
          onNext={() => {
            setDetailIndex((i) =>
              i == null || i >= sortedData.length - 1 ? i : i + 1,
            );
          }}
          onEdit={
            detailDrawer.onEdit
              ? () => detailDrawer.onEdit?.(detailRow)
              : undefined
          }
          showEditButton={
            typeof detailDrawer.showEditButton === "function"
              ? detailDrawer.showEditButton(detailRow)
              : detailDrawer.showEditButton !== false && !!detailDrawer.onEdit
          }
        >
          {detailDrawer.render(detailRow)}
        </GridDetailDrawer>
      )}
    </>
  );
}
