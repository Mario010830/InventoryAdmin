"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import {
  usePrefetchAllPagesWhileSearching,
  SEARCH_TABLE_CHUNK_PAGE_SIZE,
  TABLE_SEARCH_DEBOUNCE_MS,
} from "@/lib/usePrefetchAllPagesWhileSearching";
import { Icon } from "@/components/ui/Icon";
import type { ProductResponse, CreateProductRequest, ProductTipo } from "@/lib/dashboard-types";
import "./products-modal.css";
import { DataTable } from "@/components/DataTable";
import { GridFilterBar, GridFilterSelect } from "@/components/dashboard";
import type { DataTableColumn } from "@/components/DataTable";
import {
  useGetProductsQuery,
  useGetProductCategoriesQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useUploadProductImageMutation,
} from "./_service/productsApi";
import { DeleteModal } from "@/components/DeleteModal";
import { FormModal } from "@/components/FormModal";
import Switch from "@/components/Switch";
import { useUserPermissionCodes } from "@/lib/useUserPermissionCodes";
import { TagSelector } from "./TagSelector";
import { ProductImageGallery } from "./ProductImageGallery";
import { getProxiedImageSrc } from "@/lib/proxiedImageSrc";
import { useDisplayCurrency } from "@/contexts/DisplayCurrencyContext";
import "./products-table.css";
import { ProductDetailBody } from "@/components/dashboard-detail/entityDetailBodies";
import { ProductsBulkToolbar } from "@/components/DataTableBulkToolbar";

function ProductMarginCell({ row }: { row: ProductResponse }) {
  const { formatCup } = useDisplayCurrency();
  const p = Number(row.precio);
  const c = Number(row.costo);
  if (!Number.isFinite(p) || !Number.isFinite(c)) return <span>—</span>;
  const diff = p - c;
  const pct = p > 0 ? (diff / p) * 100 : NaN;
  const pctLabel = p > 0 ? `${pct.toFixed(1)}%` : "—";
  const pctClass =
    p > 0 && Number.isFinite(pct)
      ? pct >= 40
        ? "product-margin-cell__pct--g"
        : pct >= 20
          ? "product-margin-cell__pct--y"
          : pct >= 10
            ? "product-margin-cell__pct--o"
            : "product-margin-cell__pct--r"
      : "";
  return (
    <div className="product-margin-cell">
      <span className="dt-cell-mono">{formatCup(diff)}</span>
      <span className={`product-margin-cell__pct ${pctClass}`.trim()}>{pctLabel}</span>
    </div>
  );
}

// ─── Columns ──────────────────────────────────────────────────────────────────

const MARGIN_COLUMN_HEADER_TOOLTIP = (
  <div className="dt-th-hint__content">
    <p className="dt-th-hint__lead">Rentabilidad del producto:</p>
    <div className="dt-th-hint__lines">
      <div className="dt-th-hint__line">
        <span className="dt-th-hint__glyph" aria-hidden>
          🟢
        </span>
        <span className="dt-th-hint__text">Verde → Excelente (40% o más)</span>
      </div>
      <div className="dt-th-hint__line">
        <span className="dt-th-hint__glyph" aria-hidden>
          🟡
        </span>
        <span className="dt-th-hint__text">Amarillo → Bueno (20% – 39%)</span>
      </div>
      <div className="dt-th-hint__line">
        <span className="dt-th-hint__glyph" aria-hidden>
          🟠
        </span>
        <span className="dt-th-hint__text">Naranja → Bajo (10% – 19%)</span>
      </div>
      <div className="dt-th-hint__line">
        <span className="dt-th-hint__glyph" aria-hidden>
          🔴
        </span>
        <span className="dt-th-hint__text">Rojo → Muy bajo (menos del 10%)</span>
      </div>
    </div>
  </div>
);

function useProductColumns(): DataTableColumn<ProductResponse>[] {
  const { formatCup } = useDisplayCurrency();
  return useMemo(
    () => [
      {
        key: "imagenUrl",
        label: "Foto",
        width: "56px",
        sortable: false,
        exportable: false,
        render: (row) => (
          <div
            className="product-grid-thumb-wrap"
            title={[row.code, row.name].filter(Boolean).join(" · ")}
          >
            {row.imagenUrl ? (
              <img
                src={getProxiedImageSrc(row.imagenUrl) ?? row.imagenUrl}
                alt={row.name || ""}
                className="product-grid-thumb"
                loading="lazy"
              />
            ) : (
              <span className="product-grid-thumb product-grid-thumb--placeholder" aria-hidden>
                <Icon name="inventory_2" />
              </span>
            )}
          </div>
        ),
      },
      { key: "name", label: "Nombre", width: "min(180px, 16vw)" },
      {
        key: "description",
        label: "Descripción",
        width: "min(240px, 28vw)",
        render: (row) => (
          <span className="product-grid-desc" title={(row.description ?? "").trim() || undefined}>
            {(row.description ?? "").trim() ? row.description : "—"}
          </span>
        ),
      },
      { key: "precio", label: "Precio", type: "currency", width: "108px" },
      { key: "costo", label: "Costo", type: "currency", width: "108px" },
      {
        key: "__margin",
        label: "Margen",
        width: "104px",
        render: (row) => <ProductMarginCell row={row} />,
        sortValue: (row) => {
          const p = Number(row.precio);
          const c = Number(row.costo);
          if (!Number.isFinite(p) || !Number.isFinite(c) || p <= 0) return Number.NEGATIVE_INFINITY;
          return ((p - c) / p) * 100;
        },
        exportValue: (row) => {
          const p = Number(row.precio);
          const c = Number(row.costo);
          if (!Number.isFinite(p) || !Number.isFinite(c)) return "";
          const diff = p - c;
          const pct = p > 0 ? `${((diff / p) * 100).toFixed(1)}%` : "";
          return pct ? `${formatCup(diff)} (${pct})` : formatCup(diff);
        },
        headerTooltip: MARGIN_COLUMN_HEADER_TOOLTIP,
      },
      { key: "totalStock", label: "Stock", type: "number", width: "80px" },
      /* Anchos fijos: si no, en table-layout:fixed se estiran y “Activo” queda con un hueco enorme entre columnas */
      { key: "isAvailable", label: "Disponible", type: "boolean", width: "96px" },
      { key: "isForSale", label: "En Venta", type: "boolean", width: "96px" },
      { key: "createdAt", label: "Creado", type: "date", width: "112px" },
    ],
    [formatCup],
  );
}

const PRODUCT_TIPO_OPTIONS: { value: ProductTipo; label: string }[] = [
  { value: "inventariable", label: "Inventariable" },
  { value: "elaborado", label: "Elaborado" },
];

const initialForm = {
  tipo: "inventariable" as ProductTipo,
  code: "",
  name: "",
  description: "",
  categoryId: "" as number | string,
  precio: "0",
  costo: "0",
  imagenUrl: "",
  isAvailable: true,
  isForSale: false,
  tagIds: [] as number[],
};

// ─── Image Uploader ───────────────────────────────────────────────────────────

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}

function ImageUploader({ value, onChange, disabled }: ImageUploaderProps) {
  const [uploadImage, { isLoading }] = useUploadProductImageMutation();
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (disabled) return;
    setUploadError("");
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) {
      setUploadError("Formato no soportado. Usa JPEG, PNG, GIF o WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("El archivo supera el límite de 5 MB.");
      return;
    }
    try {
      const url = await uploadImage(file).unwrap();
      if (url) onChange(url);
    } catch {
      setUploadError("Error al subir la imagen. Intenta de nuevo.");
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const hasImage = Boolean(value);
  const busy = Boolean(disabled || isLoading);

  return (
    <div className="img-uploader">
      <div
        className={[
          "img-uploader__dropzone",
          hasImage ? "img-uploader__dropzone--has-img" : "",
          dragOver ? "img-uploader__dropzone--dragover" : "",
          busy ? "img-uploader__dropzone--disabled" : "",
        ].join(" ")}
        onClick={() => !busy && !hasImage && inputRef.current?.click()}
        onDragOver={(e) => {
          if (busy) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={busy ? undefined : onDrop}
      >
        {isLoading ? (
          <div className="img-uploader__loading">
            <div className="img-uploader__spinner" />
            <span className="img-uploader__loading-text">Subiendo imagen…</span>
          </div>
        ) : hasImage ? (
          <>
            <img src={getProxiedImageSrc(value) ?? value} alt="Preview" className="img-uploader__preview" />
            <div className="img-uploader__overlay">
              <button
                type="button"
                className="img-uploader__overlay-btn img-uploader__overlay-btn--change"
                disabled={disabled}
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              >
                <Icon name="upload" />
                Cambiar
              </button>
              <button
                type="button"
                className="img-uploader__overlay-btn img-uploader__overlay-btn--remove"
                disabled={disabled}
                onClick={(e) => { e.stopPropagation(); onChange(""); }}
              >
                <Icon name="delete" />
                Quitar
              </button>
            </div>
          </>
        ) : (
          <div className="img-uploader__placeholder">
            <div className="img-uploader__placeholder-icon">
              <Icon name="add_photo_alternate" />
            </div>
            <span className="img-uploader__placeholder-text">
              Haz clic o arrastra una imagen aquí
            </span>
            <span className="img-uploader__placeholder-hint">
              JPEG, PNG, GIF, WebP · máx. 5 MB
            </span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="img-uploader__hidden-input"
        disabled={disabled}
        onChange={onInputChange}
      />

      {uploadError && (
        <span className="img-uploader__upload-error">
          <Icon name="error_outline" />
          {uploadError}
        </span>
      )}

      <button
        type="button"
        className="img-uploader__url-toggle"
        disabled={disabled}
        onClick={() => setShowUrlInput((v) => !v)}
      >
        <Icon name={showUrlInput ? "expand_less" : "link"} />
        {showUrlInput ? "Ocultar URL" : "O ingresa una URL"}
      </button>

      {showUrlInput && (
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          disabled={disabled}
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1.5px solid #e2e8f0",
            borderRadius: "8px",
            fontSize: "0.9rem",
            fontFamily: "inherit",
            boxSizing: "border-box",
            color: "#1e293b",
          }}
        />
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const productColumns = useProductColumns();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [filterText, setFilterText] = useState("");
  const debouncedFilterText = useDebouncedValue(filterText, TABLE_SEARCH_DEBOUNCE_MS);
  const [filterCategoryId, setFilterCategoryId] = useState<string>("");
  const [filterAvailable, setFilterAvailable] = useState<string>("");
  const [filterForSale, setFilterForSale] = useState<string>("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const shouldPrefetchAll =
    debouncedFilterText.trim().length > 0 ||
    filterCategoryId !== "" ||
    filterAvailable !== "" ||
    filterForSale !== "" ||
    priceMin.trim() !== "" ||
    priceMax.trim() !== "";
  const perPage = shouldPrefetchAll ? Math.max(pageSize, SEARCH_TABLE_CHUNK_PAGE_SIZE) : pageSize;
  const loadNextPage = useCallback(() => setPage((p) => p + 1), []);
  const [allRows, setAllRows] = useState<ProductResponse[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductResponse | null>(null);
  const [form, setForm] = useState(initialForm);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState<ProductResponse | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const filtersChanged = useRef(false);

  const [confirmCostHigherOpen, setConfirmCostHigherOpen] = useState(false);

  // ─── Queries ──────────────────────────────────────────────────────────────

  const { data: result, isLoading, isFetching } = useGetProductsQuery({ page, perPage });
  const { data: categoriesResult } = useGetProductCategoriesQuery({ perPage: 100 });

  const [createProduct] = useCreateProductMutation();
  const [updateProduct] = useUpdateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();

  const { has: hasPermission } = useUserPermissionCodes();
  const canCreateProduct = hasPermission("product.create");
  const canEditProduct = hasPermission("product.update");
  const canDeleteProduct = hasPermission("product.delete");

  const categories = categoriesResult?.data ?? [];

  
  const loadedRows =
    page === 1 && allRows.length === 0
      ? (result?.data ?? [])
      : allRows;

  // Accumulate rows across pages
  useEffect(() => {
    if (!result?.data) return;
    const resultPage = result.pagination?.currentPage ?? 1;
    if (resultPage !== page) return;
    setAllRows((prev) => {
      if (page === 1) return result.data;
      const existingIds = new Set(prev.map((r) => r.id));
      const newItems = result.data.filter((item) => !existingIds.has(item.id));
      return [...prev, ...newItems];
    });
  }, [result?.data, result?.pagination?.currentPage, page]);

  usePrefetchAllPagesWhileSearching({
    isSearchActive: shouldPrefetchAll,
    isFetching,
    pagination: result?.pagination,
    loadNextPage,
  });

  useEffect(() => {
    if (!filtersChanged.current) { filtersChanged.current = true; return; }
    setPage(1);
    setAllRows([]);
  }, [debouncedFilterText, filterCategoryId, filterAvailable, filterForSale, priceMin, priceMax]);

  const clearGridFilters = () => {
    setFilterText("");
    setFilterCategoryId("");
    setFilterAvailable("");
    setFilterForSale("");
    setPriceMin("");
    setPriceMax("");
  };

  const filteredData = useMemo(() => {
    let rows = loadedRows;
    const q = debouncedFilterText.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (row) =>
          String(row.name ?? "").toLowerCase().includes(q) ||
          String(row.code ?? "").toLowerCase().includes(q) ||
          String(row.description ?? "").toLowerCase().includes(q),
      );
    }
    if (filterCategoryId !== "") {
      const cid = Number(filterCategoryId);
      rows = rows.filter((r) => r.categoryId === cid);
    }
    if (filterAvailable === "yes") rows = rows.filter((r) => r.isAvailable);
    if (filterAvailable === "no") rows = rows.filter((r) => !r.isAvailable);
    if (filterForSale === "yes") rows = rows.filter((r) => r.isForSale);
    if (filterForSale === "no") rows = rows.filter((r) => !r.isForSale);
    const pMin = parseFloat(priceMin.replace(",", "."));
    if (!Number.isNaN(pMin)) rows = rows.filter((r) => r.precio >= pMin);
    const pMax = parseFloat(priceMax.replace(",", "."));
    if (!Number.isNaN(pMax)) rows = rows.filter((r) => r.precio <= pMax);
    return rows;
  }, [
    loadedRows,
    debouncedFilterText,
    filterCategoryId,
    filterAvailable,
    filterForSale,
    priceMin,
    priceMax,
  ]);

  const gridFiltersActive =
    filterText.trim() !== "" ||
    filterCategoryId !== "" ||
    filterAvailable !== "" ||
    filterForSale !== "" ||
    priceMin.trim() !== "" ||
    priceMax.trim() !== "";

  const hasMore =
    !shouldPrefetchAll && result?.pagination
      ? page < result.pagination.totalPages
      : false;

  const handleLoadMore = () => {
    if (!isFetching && hasMore) setPage((p) => p + 1);
  };

  // ─── Form handlers ─────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (item: ProductResponse) => {
    setEditing(item);
    setForm({
      tipo: item.tipo ?? "inventariable",
      code: item.code,
      name: item.name,
      description: item.description ?? "",
      categoryId: item.categoryId ?? "",
      precio: String(item.precio),
      costo: String(item.costo),
      imagenUrl: item.imagenUrl ?? "",
      isAvailable: item.isAvailable,
      isForSale: item.isForSale ?? false,
      tagIds: item.tagIds ?? [],
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const validate = (): boolean => {
    const err: Record<string, string> = {};
    if (!form.code.trim()) err.code = "El código es requerido";
    if (!form.name.trim()) err.name = "El nombre es requerido";
    const precio = Number(form.precio);
    const costo = Number(form.costo);
    if (Number.isNaN(precio) || precio < 0) err.precio = "Precio inválido";
    if (Number.isNaN(costo)  || costo  < 0) err.costo  = "Costo inválido";
    setFormErrors(err);
    return Object.keys(err).length === 0;
  };

  const performSubmit = async () => {
    const payload: CreateProductRequest = {
      tipo: form.tipo,
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description.trim(),
      categoryId: form.categoryId === "" ? null : Number(form.categoryId),
      precio: Number(form.precio),
      costo: Number(form.costo),
      imagenUrl: form.imagenUrl.trim(),
      isAvailable: form.isAvailable,
      isForSale: form.isForSale,
      tagIds: form.tagIds.length > 0 ? form.tagIds : undefined,
    };
    if (editing) {
      await updateProduct({ id: editing.id, body: payload }).unwrap();
    } else {
      await createProduct(payload).unwrap();
      setPage(1);
      setAllRows([]);
    }
    closeForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const costo = Number(form.costo);
    const precio = Number(form.precio);
    if (costo > precio) {
      setConfirmCostHigherOpen(true);
      return;
    }
    setFormSubmitting(true);
    try {
      await performSubmit();
    } catch (err) {
      setFormErrors({ submit: err instanceof Error ? err.message : "Error al guardar" });
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleConfirmCostHigher = async () => {
    setConfirmCostHigherOpen(false);
    setFormSubmitting(true);
    try {
      await performSubmit();
    } catch (err) {
      setFormErrors({ submit: err instanceof Error ? err.message : "Error al guardar" });
      setFormOpen(true);
    } finally {
      setFormSubmitting(false);
    }
  };

  // ─── Delete handlers ───────────────────────────────────────────────────────

  const openDelete = (item: ProductResponse) => {
    setDeleting(item);
    setDeleteError("");
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    setConfirmOpen(false);
    setDeleting(null);
    setDeleteError("");
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteProduct(deleting.id).unwrap();
      // Remove deleted item from local rows immediately
      setAllRows((prev) => prev.filter((r) => r.id !== deleting.id));
      closeConfirm();
    } catch {
      setDeleteError("Error al eliminar. Intenta de nuevo.");
    }
  };

  const handleBulkDeleteProducts = async (ids: number[]) => {
    for (const id of ids) {
      await deleteProduct(id).unwrap();
    }
    setAllRows((prev) => prev.filter((r) => !ids.includes(r.id)));
  };

  const handleBulkSetAvailable = async (value: boolean, ids: number[]) => {
    for (const id of ids) {
      await updateProduct({ id, body: { isAvailable: value } }).unwrap();
    }
    setAllRows((prev) =>
      prev.map((r) => (ids.includes(r.id) ? { ...r, isAvailable: value } : r)),
    );
  };

  const handleBulkSetForSale = async (value: boolean, ids: number[]) => {
    for (const id of ids) {
      await updateProduct({ id, body: { isForSale: value } }).unwrap();
    }
    setAllRows((prev) =>
      prev.map((r) => (ids.includes(r.id) ? { ...r, isForSale: value } : r)),
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="products-page-wrap">
      <DataTable
        gridConfig={{
          storageKey: "dashboard-products",
          exportFilenamePrefix: "productos",
          primaryColumnKey: "name",
          bulkEntityLabel: "productos",
        }}
        renderBulkToolbar={(ctx) => (
          <ProductsBulkToolbar
            count={ctx.count}
            onClear={ctx.clearSelection}
            onDeleteSelected={
              canDeleteProduct ? () => void handleBulkDeleteProducts(ctx.selectedIds) : undefined
            }
            onSetAvailable={(v) => void handleBulkSetAvailable(v, ctx.selectedIds)}
            onSetForSale={(v) => void handleBulkSetForSale(v, ctx.selectedIds)}
            exportSelectedCsv={ctx.exportSelectedCsv}
            exportSelectedXlsx={ctx.exportSelectedXlsx}
            showDelete={canDeleteProduct}
            disableMutations={!canEditProduct}
          />
        )}
        filters={
          <GridFilterBar onClear={clearGridFilters}>
            <div className="grid-filter-bar__field">
              <span className="grid-filter-bar__label">Buscar</span>
              <input
                type="search"
                className={`grid-filter-bar__control grid-filter-bar__control--wide ${filterText.trim() ? "grid-filter-bar__control--active" : ""}`}
                placeholder="Nombre, código, descripción…"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </div>
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
                  ...categories.map((c) => ({ value: String(c.id), label: c.name })),
                ]}
              />
            </div>
            <div className="grid-filter-bar__field">
              <span className="grid-filter-bar__label">Disponible</span>
              <GridFilterSelect
                aria-label="Disponible"
                value={filterAvailable}
                onChange={setFilterAvailable}
                active={filterAvailable !== ""}
            options={[
              { value: "", label: "Todos" },
              { value: "yes", label: "Activo" },
              { value: "no", label: "Inactivo" },
            ]}
          />
        </div>
        <div className="grid-filter-bar__field">
          <span className="grid-filter-bar__label">En venta</span>
          <GridFilterSelect
            aria-label="En venta"
            value={filterForSale}
            onChange={setFilterForSale}
            active={filterForSale !== ""}
            options={[
              { value: "", label: "Todos" },
                  { value: "yes", label: "Activo" },
                  { value: "no", label: "Inactivo" },
                ]}
              />
            </div>
            <div className="grid-filter-bar__field">
              <span className="grid-filter-bar__label">Precio</span>
              <div className="grid-filter-bar__price-range">
                <input
                  type="text"
                  inputMode="decimal"
                  className={`grid-filter-bar__control grid-filter-bar__control--narrow ${priceMin.trim() ? "grid-filter-bar__control--active" : ""}`}
                  placeholder="Min"
                  aria-label="Precio mínimo"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                />
                <span className="grid-filter-bar__price-dash" aria-hidden>
                  –
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  className={`grid-filter-bar__control grid-filter-bar__control--narrow ${priceMax.trim() ? "grid-filter-bar__control--active" : ""}`}
                  placeholder="Max"
                  aria-label="Precio máximo"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                />
              </div>
            </div>
          </GridFilterBar>
        }
        data={filteredData}
        columns={productColumns}
        loading={allRows.length === 0 && (isLoading || isFetching)}
        title="Productos"
        titleIcon="inventory_2"
        addLabel="Nuevo Producto"
        onAdd={openCreate}
        addDisabled={!canCreateProduct}
        addButtonDataTutorial="tutorial-products-add"
        actions={[
          { icon: "edit", label: "Editar", onClick: openEdit, disabled: () => !canEditProduct },
          { icon: "delete_outline", label: "Eliminar", onClick: openDelete, variant: "danger", disabled: () => !canDeleteProduct },
        ]}
        detailDrawer={{
          entityLabelPlural: "productos",
          getTitle: (row) => row.name?.trim() || row.code || `Producto #${row.id}`,
          getStatusBadge: (row) => (
            <span className={`dt-tag ${row.isAvailable ? "dt-tag--green" : "dt-tag--red"}`}>
              {row.isAvailable ? "Activo" : "Inactivo"}
            </span>
          ),
          render: (row) => (
            <ProductDetailBody
              row={row}
              categoryName={categories.find((c) => c.id === row.categoryId)?.name ?? "—"}
            />
          ),
          onEdit: openEdit,
          showEditButton: () => canEditProduct,
        }}
        infiniteScroll
        onLoadMore={handleLoadMore}
        hasMore={hasMore}
        loadingMore={isFetching && page > 1}
        emptyIcon="inventory_2"
        emptyTitle="Sin registros"
        emptyDesc={
          gridFiltersActive && loadedRows.length > 0
            ? "Ningún producto coincide con los filtros."
            : loadedRows.length === 0
              ? "Aún no hay productos"
              : "Sin resultados"
        }
      />
      </div>

      {/* ── Form modal ── */}
      <FormModal
        open={formOpen}
        onClose={closeForm}
        title={editing ? "Editar Producto" : "Nuevo Producto"}
        icon={editing ? "edit" : "inventory_2"}
        onSubmit={handleSubmit}
        submitting={formSubmitting}
        submitLabel={editing ? "Guardar" : "Crear"}
        error={formErrors.submit}
      >
        <div className="modal-field field-full">
          <label htmlFor="tipo">Tipo de producto</label>
          <select
            id="tipo"
            value={form.tipo}
            onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as ProductTipo }))}
          >
            {PRODUCT_TIPO_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="modal-field">
          <label htmlFor="code">Código *</label>
          <input
            id="code"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            placeholder="Código"
          />
          {formErrors.code && <p className="form-error">{formErrors.code}</p>}
        </div>

        <div className="modal-field">
          <label htmlFor="name">Nombre *</label>
          <input
            id="name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Nombre"
          />
          {formErrors.name && <p className="form-error">{formErrors.name}</p>}
        </div>

        <div className="modal-field field-full">
          <label htmlFor="description">Descripción</label>
          <textarea
            id="description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Descripción"
            rows={3}
          />
        </div>

        <div className="modal-field">
          <label htmlFor="categoryId">Categoría</label>
          <select
            id="categoryId"
            value={form.categoryId}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                categoryId: e.target.value === "" ? "" : Number(e.target.value),
              }))
            }
          >
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="modal-field field-full">
          <label>Etiquetas</label>
          <TagSelector
            value={form.tagIds}
            onChange={(tagIds) => setForm((f) => ({ ...f, tagIds }))}
          />
        </div>

        <div className="modal-field">
          <label htmlFor="precio">Precio *</label>
          <input
            id="precio"
            type="number"
            step="0.01"
            min="0"
            value={form.precio}
            onChange={(e) => setForm((f) => ({ ...f, precio: e.target.value }))}
          />
          {formErrors.precio && <p className="form-error">{formErrors.precio}</p>}
        </div>

        <div className="modal-field">
          <label htmlFor="costo">Costo *</label>
          <input
            id="costo"
            type="number"
            step="0.01"
            min="0"
            value={form.costo}
            onChange={(e) => setForm((f) => ({ ...f, costo: e.target.value }))}
          />
          {formErrors.costo && <p className="form-error">{formErrors.costo}</p>}
        </div>

        <div className="modal-field field-full">
          <ProductImageGallery
            mode={editing ? "edit" : "create"}
            productId={editing?.id}
            imagenUrl={form.imagenUrl}
            onImagenUrlChange={(url) => setForm((f) => ({ ...f, imagenUrl: url }))}
            disabled={editing ? !canEditProduct : !canCreateProduct}
            createSlot={
              <ImageUploader
                value={form.imagenUrl}
                onChange={(url) => setForm((f) => ({ ...f, imagenUrl: url }))}
                disabled={!canCreateProduct}
              />
            }
          />
        </div>

        <div className="modal-field field-full modal-toggle">
          <Switch
            checked={form.isAvailable}
            onChange={(checked) => setForm((f) => ({ ...f, isAvailable: checked }))}
          />
          <label>Disponible</label>
        </div>

        <div className="modal-field field-full modal-toggle">
          <Switch
            checked={form.isForSale}
            onChange={(checked) => setForm((f) => ({ ...f, isForSale: checked }))}
          />
          <label>En venta (visible en catálogo público)</label>
        </div>
      </FormModal>

      {/* ── Delete modal ── */}
      <DeleteModal
        open={confirmOpen && !!deleting}
        onClose={closeConfirm}
        onConfirm={handleDelete}
        title="¿Eliminar producto?"
        itemName={deleting?.name}
        error={deleteError}
      />

      {/* ── Confirmar costo mayor que precio ── */}
      {confirmCostHigherOpen && (
        <div className="modal-overlay" onClick={() => setConfirmCostHigherOpen(false)}>
          <div className="modal-box confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon confirm-icon--warning">
              <Icon name="warning_amber" />
            </div>
            <h3 className="confirm-title">¿Estás seguro?</h3>
            <p className="confirm-msg">
              El costo es mayor que el precio de venta (por ejemplo en un remate). ¿Deseas guardar así?
            </p>
            <div className="confirm-actions">
              <button
                type="button"
                className="confirm-btn confirm-btn--cancel"
                onClick={() => setConfirmCostHigherOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="confirm-btn confirm-btn--primary"
                onClick={handleConfirmCostHigher}
              >
                Sí, guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}