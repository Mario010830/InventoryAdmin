"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  useLoadAllRemainingPages,
  SEARCH_TABLE_CHUNK_PAGE_SIZE,
} from "@/lib/useLoadAllRemainingPages";
import type { ProductResponse } from "@/lib/dashboard-types";
import { DataTable } from "@/components/DataTable";
import type { DataTableColumn } from "@/components/DataTable";
import { useGetProductsQuery } from "@/app/dashboard/products/_service/productsApi";
import {
  useGetPromotionsQuery,
  useCreatePromotionMutation,
  useUpdatePromotionMutation,
  useSetPromotionActiveMutation,
  useDeletePromotionMutation,
  type PromotionResponse,
  type PromotionType,
} from "./_service/promotionApi";
import { FormModal } from "@/components/FormModal";
import { DeleteModal } from "@/components/DeleteModal";
import { GridFilterBar, GridFilterSelect } from "@/components/dashboard";
import Switch from "@/components/Switch";
import "../products/products-modal.css";
import { useUserPermissionCodes } from "@/lib/useUserPermissionCodes";
import { useDisplayCurrency } from "@/contexts/DisplayCurrencyContext";

type EstadoFiltro = "" | "active_valid" | "active_invalid" | "inactive";

function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalToIso(local: string): string | undefined {
  const t = local.trim();
  if (!t) return undefined;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function promotionOverlapsRange(
  startsAt: string | null,
  endsAt: string | null,
  rangeFrom: string,
  rangeTo: string,
): boolean {
  const startMs = startsAt ? new Date(startsAt).getTime() : Number.NEGATIVE_INFINITY;
  const endMs = endsAt ? new Date(endsAt).getTime() : Number.POSITIVE_INFINITY;
  const rf = new Date(`${rangeFrom}T00:00:00`).getTime();
  const rt = new Date(`${rangeTo}T23:59:59.999`).getTime();
  if (Number.isNaN(rf) || Number.isNaN(rt)) return true;
  return startMs <= rt && endMs >= rf;
}

function activeOnlyForEstado(estado: EstadoFiltro): boolean | undefined {
  if (estado === "inactive") return false;
  if (estado === "active_valid" || estado === "active_invalid") return true;
  return undefined;
}

function applyEstadoClient(rows: PromotionResponse[], estado: EstadoFiltro): PromotionResponse[] {
  if (estado === "active_valid") {
    return rows.filter((r) => r.isActive && r.isCurrentlyValid);
  }
  if (estado === "active_invalid") {
    return rows.filter((r) => r.isActive && !r.isCurrentlyValid);
  }
  if (estado === "inactive") {
    return rows.filter((r) => !r.isActive);
  }
  return rows;
}

function deletePromotionErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "data" in err) {
    const data = (err as { data?: unknown }).data;
    if (typeof data === "string" && data.trim()) return data.trim();
    if (data && typeof data === "object") {
      const o = data as Record<string, unknown>;
      const m = o.message ?? o.Message ?? o.title ?? o.Title;
      if (typeof m === "string" && m.trim()) return m.trim();
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return "No se pudo eliminar. Intenta de nuevo.";
}

function promotionStatusBadge(row: PromotionResponse) {
  if (!row.isActive) {
    return <span className="dt-tag dt-tag--red">Inactiva</span>;
  }
  if (row.isCurrentlyValid) {
    return <span className="dt-tag dt-tag--green">Activa y vigente</span>;
  }
  return (
    <span
      className="dt-tag"
      style={{ background: "#fffbeb", color: "#b45309" }}
    >
      Activa · fuera de vigencia
    </span>
  );
}

interface PromoFormState {
  productId: number;
  type: PromotionType;
  value: string;
  minQuantity: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

const initialForm = (): PromoFormState => ({
  productId: 0,
  type: "percentage",
  value: "10",
  minQuantity: "1",
  startsAt: "",
  endsAt: "",
  isActive: true,
});

export default function PromotionsPage() {
  const { formatCup } = useDisplayCurrency();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterProductId, setFilterProductId] = useState("");
  const [filterEstado, setFilterEstado] = useState<EstadoFiltro>("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const perPage = Math.max(pageSize, SEARCH_TABLE_CHUNK_PAGE_SIZE);
  const loadNextPage = useCallback(() => setPage((p) => p + 1), []);

  const productIdArg =
    filterProductId.trim() === "" ? undefined : Number(filterProductId);
  const productIdQuery =
    productIdArg != null && Number.isFinite(productIdArg) && productIdArg > 0
      ? productIdArg
      : undefined;

  const activeOnlyArg = activeOnlyForEstado(filterEstado);

  const { data: promoResult, isLoading, isFetching } = useGetPromotionsQuery({
    page,
    perPage,
    productId: productIdQuery,
    activeOnly: activeOnlyArg,
  });

  const [createPromotion] = useCreatePromotionMutation();
  const [updatePromotion] = useUpdatePromotionMutation();
  const [setPromotionActive] = useSetPromotionActiveMutation();
  const [deletePromotion] = useDeletePromotionMutation();

  const { has: hasPermission } = useUserPermissionCodes();
  const canManage = hasPermission("product.update");
  /** Misma regla que editar/crear; el API valida permisos reales. */
  const canDeletePromotion = canManage;

  const [productPage, setProductPage] = useState(1);
  const loadNextProductPage = useCallback(() => setProductPage((p) => p + 1), []);
  const productPerPage = SEARCH_TABLE_CHUNK_PAGE_SIZE;
  const { data: productsResult, isFetching: productsFetching } = useGetProductsQuery({
    page: productPage,
    perPage: productPerPage,
  });

  const [allProducts, setAllProducts] = useState<ProductResponse[]>([]);
  useEffect(() => {
    if (!productsResult?.data) return;
    setAllProducts((prev) => {
      if (productPage === 1) return productsResult.data;
      const ids = new Set(prev.map((p) => p.id));
      const fresh = productsResult.data.filter((p) => !ids.has(p.id));
      return [...prev, ...fresh];
    });
  }, [productsResult?.data, productPage]);

  useLoadAllRemainingPages({
    isFetching: productsFetching,
    pagination: productsResult?.pagination,
    loadNextPage: loadNextProductPage,
  });

  const productById = useMemo(() => {
    const m = new Map<number, ProductResponse>();
    for (const p of allProducts) m.set(p.id, p);
    return m;
  }, [allProducts]);

  const [allPromoRows, setAllPromoRows] = useState<PromotionResponse[]>([]);
  useEffect(() => {
    if (!promoResult?.data) return;
    setAllPromoRows((prev) => {
      if (page === 1) return promoResult.data;
      const ids = new Set(prev.map((r) => r.id));
      const fresh = promoResult.data.filter((r: PromotionResponse) => !ids.has(r.id));
      return [...prev, ...fresh];
    });
  }, [promoResult?.data, page]);

  useLoadAllRemainingPages({
    isFetching,
    pagination: promoResult?.pagination,
    loadNextPage,
  });

  const filtersChanged = useRef(false);
  useEffect(() => {
    if (!filtersChanged.current) {
      filtersChanged.current = true;
      return;
    }
    setPage(1);
    setAllPromoRows([]);
  }, [filterProductId, filterEstado, filterDateFrom, filterDateTo, productIdQuery, activeOnlyArg]);

  const loadedPromos =
    page === 1 && allPromoRows.length === 0 ? (promoResult?.data ?? []) : allPromoRows;

  const filteredByEstado = useMemo(
    () => applyEstadoClient(loadedPromos, filterEstado),
    [loadedPromos, filterEstado],
  );

  const filteredData = useMemo(() => {
    let rows = filteredByEstado;
    if (filterDateFrom.trim() && filterDateTo.trim()) {
      rows = rows.filter((r) =>
        promotionOverlapsRange(r.startsAt, r.endsAt, filterDateFrom.trim(), filterDateTo.trim()),
      );
    }
    return rows.map((r) => {
      const p = productById.get(r.productId);
      const name =
        r.productName ??
        p?.name ??
        (r.productCode ? `${r.productCode}` : `Producto #${r.productId}`);
      return { ...r, _displayProduct: name };
    });
  }, [filteredByEstado, filterDateFrom, filterDateTo, productById]);

  type Row = PromotionResponse & { _displayProduct: string };

  const columns: DataTableColumn<Row>[] = useMemo(
    () => [
      {
        key: "_displayProduct",
        label: "Producto",
        sortValue: (r) => r._displayProduct,
      },
      {
        key: "promotionType",
        label: "Tipo",
        render: (r) => (r.promotionType === "fixed" ? "Precio fijo" : "Porcentaje"),
      },
      {
        key: "value",
        label: "Valor",
        render: (r) =>
          r.promotionType === "fixed" ? (
            <span className="dt-cell-mono">{formatCup(r.value)}</span>
          ) : (
            <span className="dt-cell-mono">{r.value}%</span>
          ),
      },
      {
        key: "minQuantity",
        label: "Cant. mín.",
        type: "number",
      },
      {
        key: "startsAt",
        label: "Vigencia",
        sortable: false,
        render: (r) => {
          if (!r.startsAt && !r.endsAt) return <span className="dt-cell-clamp">Indefinida</span>;
          const a = r.startsAt ? new Date(r.startsAt).toLocaleString("es-ES") : "—";
          const b = r.endsAt ? new Date(r.endsAt).toLocaleString("es-ES") : "—";
          return (
            <span className="dt-cell-clamp" title={`${a} → ${b}`}>
              {a} → {b}
            </span>
          );
        },
      },
      {
        key: "isActive",
        label: "Estado",
        sortable: false,
        render: (r) => promotionStatusBadge(r),
      },
    ],
    [formatCup],
  );

  const allPagesLoaded =
    promoResult?.pagination != null && page >= (promoResult.pagination.totalPages ?? 1);

  const gridFiltersActive =
    filterProductId !== "" || filterEstado !== "" || filterDateFrom !== "" || filterDateTo !== "";

  const clearGridFilters = () => {
    setFilterProductId("");
    setFilterEstado("");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PromotionResponse | null>(null);
  const [form, setForm] = useState<PromoFormState>(initialForm);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const selectedProduct = form.productId > 0 ? productById.get(form.productId) : undefined;

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm());
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (item: Row) => {
    const raw = { ...item };
    delete (raw as Record<string, unknown>)._displayProduct;
    setEditing(raw as PromotionResponse);
    setForm({
      productId: item.productId,
      type: item.promotionType,
      value: String(item.value),
      minQuantity: String(item.minQuantity),
      startsAt: isoToDatetimeLocal(item.startsAt),
      endsAt: isoToDatetimeLocal(item.endsAt),
      isActive: item.isActive,
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
    if (!editing && (!form.productId || form.productId <= 0)) {
      err.productId = "Selecciona un producto";
    }
    const minQty = Number(form.minQuantity);
    if (!Number.isFinite(minQty) || minQty < 1 || !Number.isInteger(minQty)) {
      err.minQuantity = "La cantidad mínima debe ser un entero ≥ 1";
    }
    const val = Number(form.value);
    if (!Number.isFinite(val)) {
      err.value = "Valor numérico inválido";
    } else if (form.type === "percentage") {
      if (val < 1 || val > 99) err.value = "El porcentaje debe estar entre 1 y 99";
    } else if (val <= 0) {
      err.value = "El precio fijo debe ser mayor que 0";
    }
    const hasStart = Boolean(form.startsAt.trim());
    const hasEnd = Boolean(form.endsAt.trim());
    if (hasStart !== hasEnd) {
      err.dates = "Indica ambas fechas (inicio y fin) o ninguna para vigencia indefinida";
    }
    if (hasStart && hasEnd) {
      const s = new Date(form.startsAt).getTime();
      const e = new Date(form.endsAt).getTime();
      if (!Number.isNaN(s) && !Number.isNaN(e) && e < s) {
        err.dates = "La fecha de fin debe ser posterior o igual al inicio";
      }
    }
    setFormErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setFormSubmitting(true);
    try {
      const minQuantity = Number(form.minQuantity);
      const value = Number(form.value);
      const startsAtIso = form.startsAt.trim() ? datetimeLocalToIso(form.startsAt) : undefined;
      const endsAtIso = form.endsAt.trim() ? datetimeLocalToIso(form.endsAt) : undefined;

      if (editing) {
        await updatePromotion({
          id: editing.id,
          body: {
            type: form.type,
            value,
            minQuantity,
            isActive: form.isActive,
            startsAt: startsAtIso ?? null,
            endsAt: endsAtIso ?? null,
          },
        }).unwrap();
      } else {
        await createPromotion({
          productId: form.productId,
          type: form.type,
          value,
          minQuantity,
          isActive: form.isActive,
          ...(startsAtIso && endsAtIso ? { startsAt: startsAtIso, endsAt: endsAtIso } : {}),
        }).unwrap();
        setPage(1);
      }
      closeForm();
    } catch (er) {
      setFormErrors({
        submit: er instanceof Error ? er.message : "Error al guardar",
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleActive = async (row: PromotionResponse, next: boolean) => {
    if (!canManage) return;
    setTogglingId(row.id);
    try {
      await setPromotionActive({ id: row.id, isActive: next }).unwrap();
    } finally {
      setTogglingId(null);
    }
  };

  const openDelete = (item: Row) => {
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
      await deletePromotion(deleting.id).unwrap();
      setAllPromoRows((prev) => prev.filter((r) => r.id !== deleting.id));
      closeConfirm();
    } catch (e) {
      setDeleteError(deletePromotionErrorMessage(e));
    }
  };

  return (
    <>
      <DataTable<Row>
        gridConfig={{
          storageKey: "dashboard-promotions",
          exportFilenamePrefix: "promociones",
          primaryColumnKey: "_displayProduct",
          bulkEntityLabel: "promociones",
        }}
        filters={
          <GridFilterBar onClear={clearGridFilters}>
            <div className="grid-filter-bar__field">
              <span className="grid-filter-bar__label">Producto</span>
              <GridFilterSelect
                aria-label="Producto"
                value={filterProductId}
                onChange={setFilterProductId}
                active={filterProductId !== ""}
                className="grid-filter-bar__control--wide"
                options={[
                  { value: "", label: "Todos" },
                  ...allProducts.map((p) => ({
                    value: String(p.id),
                    label: `${p.name} (#${p.id})`,
                  })),
                ]}
              />
            </div>
            <div className="grid-filter-bar__field">
              <span className="grid-filter-bar__label">Estado</span>
              <GridFilterSelect
                aria-label="Estado"
                value={filterEstado}
                onChange={(v) => setFilterEstado(v as EstadoFiltro)}
                active={filterEstado !== ""}
                className="grid-filter-bar__control--medium"
                options={[
                  { value: "", label: "Todos" },
                  { value: "active_valid", label: "Activa y vigente" },
                  { value: "active_invalid", label: "Activa · fuera de vigencia" },
                  { value: "inactive", label: "Inactiva" },
                ]}
              />
            </div>
            <div className="grid-filter-bar__field">
              <span className="grid-filter-bar__label">Desde</span>
              <input
                type="date"
                className={`grid-filter-bar__control ${filterDateFrom ? "grid-filter-bar__control--active" : ""}`}
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
              />
            </div>
            <div className="grid-filter-bar__field">
              <span className="grid-filter-bar__label">Hasta</span>
              <input
                type="date"
                className={`grid-filter-bar__control ${filterDateTo ? "grid-filter-bar__control--active" : ""}`}
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
              />
            </div>
          </GridFilterBar>
        }
        data={filteredData}
        columns={columns}
        loading={allPromoRows.length === 0 && (isLoading || isFetching)}
        title="Promociones"
        titleIcon="local_offer"
        addLabel="Crear promoción"
        onAdd={openCreate}
        addDisabled={!canManage}
        actions={[
          {
            icon: "edit",
            label: "Editar",
            onClick: openEdit,
            disabled: () => !canManage,
          },
          {
            icon: "toggle_on",
            label: "Activar",
            onClick: (r) => void handleToggleActive(r, true),
            hidden: (r) => r.isActive,
            disabled: () => !canManage || togglingId != null,
          },
          {
            icon: "toggle_off",
            label: "Desactivar",
            onClick: (r) => void handleToggleActive(r, false),
            hidden: (r) => !r.isActive,
            disabled: () => !canManage || togglingId != null,
          },
          {
            icon: "delete_outline",
            label: "Eliminar",
            onClick: openDelete,
            variant: "danger",
            disabled: () => !canDeletePromotion,
          },
        ]}
        detailDrawer={{
          entityLabelPlural: "promociones",
          getTitle: (r) => r._displayProduct,
          getStatusBadge: (r) => promotionStatusBadge(r),
          render: (r) => (
            <div className="modal-field-grid" style={{ display: "grid", gap: 12 }}>
              <p>
                <strong>Tipo:</strong>{" "}
                {r.promotionType === "fixed" ? "Precio fijo" : "Porcentaje"}
              </p>
              <p>
                <strong>Valor:</strong>{" "}
                {r.promotionType === "fixed" ? formatCup(r.value) : `${r.value}%`}
              </p>
              <p>
                <strong>Cantidad mínima:</strong> {r.minQuantity}
              </p>
              <p>
                <strong>Vigencia:</strong>{" "}
                {!r.startsAt && !r.endsAt
                  ? "Indefinida (mientras esté activa)"
                  : `${r.startsAt ?? "—"} → ${r.endsAt ?? "—"}`}
              </p>
            </div>
          ),
          onEdit: openEdit,
          showEditButton: () => canManage,
        }}
        infiniteScroll
        hasMore={!allPagesLoaded}
        loadingMore={isFetching && !allPagesLoaded}
        emptyIcon="local_offer"
        emptyTitle="Sin promociones"
        emptyDesc={
          gridFiltersActive && loadedPromos.length > 0
            ? "Ninguna promoción coincide con los filtros."
            : "Aún no hay promociones"
        }
      />

      {formOpen && (
        <FormModal
          open={formOpen}
          onClose={closeForm}
          title={editing ? "Editar promoción" : "Crear promoción"}
          icon={editing ? "edit" : "local_offer"}
          onSubmit={handleSubmit}
          submitting={formSubmitting}
          submitLabel={editing ? "Guardar" : "Crear"}
          error={formErrors.submit}
        >
          <div className="modal-field field-full">
            <label htmlFor="promo-product">Producto *</label>
            <select
              id="promo-product"
              value={form.productId || ""}
              disabled={Boolean(editing)}
              onChange={(e) =>
                setForm((f) => ({ ...f, productId: Number(e.target.value) || 0 }))
              }
            >
              <option value="">Seleccionar…</option>
              {allProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatCup(p.precio)} (#{p.id})
                </option>
              ))}
            </select>
            {formErrors.productId && <p className="form-error">{formErrors.productId}</p>}
            {selectedProduct && (
              <p className="form-hint" style={{ marginTop: 6, fontSize: "0.85rem", opacity: 0.85 }}>
                Precio base actual: <strong>{formatCup(selectedProduct.precio)}</strong>
              </p>
            )}
          </div>

          <div className="modal-field">
            <label htmlFor="promo-type">Tipo</label>
            <select
              id="promo-type"
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  type: e.target.value as PromotionType,
                }))
              }
            >
              <option value="percentage">Porcentaje (1–99 %)</option>
              <option value="fixed">Precio fijo final</option>
            </select>
          </div>

          <div className="modal-field">
            <label htmlFor="promo-value">
              {form.type === "percentage" ? "Porcentaje" : "Precio fijo"}
            </label>
            <input
              id="promo-value"
              type="number"
              step={form.type === "percentage" ? "1" : "0.01"}
              min={form.type === "percentage" ? 1 : 0}
              max={form.type === "percentage" ? 99 : undefined}
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
            />
            {formErrors.value && <p className="form-error">{formErrors.value}</p>}
          </div>

          <div className="modal-field">
            <label htmlFor="promo-min-qty">Cantidad mínima</label>
            <input
              id="promo-min-qty"
              type="number"
              min={1}
              step={1}
              value={form.minQuantity}
              onChange={(e) => setForm((f) => ({ ...f, minQuantity: e.target.value }))}
            />
            {formErrors.minQuantity && <p className="form-error">{formErrors.minQuantity}</p>}
          </div>

          <div className="modal-field field-full">
            <label htmlFor="promo-start">Inicio (opcional)</label>
            <input
              id="promo-start"
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
            />
          </div>
          <div className="modal-field field-full">
            <label htmlFor="promo-end">Fin (opcional)</label>
            <input
              id="promo-end"
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
            />
            {formErrors.dates && <p className="form-error">{formErrors.dates}</p>}
            <p className="form-hint" style={{ marginTop: 6, fontSize: "0.82rem", opacity: 0.8 }}>
              Sin fechas = vigencia indefinida mientras la promoción esté activa.
            </p>
          </div>

          <div className="modal-field field-full modal-toggle">
            <Switch
              checked={form.isActive}
              onChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
            />
            <span>Promoción activa</span>
          </div>
        </FormModal>
      )}

      {confirmOpen && deleting && (
        <DeleteModal
          open={confirmOpen && !!deleting}
          onClose={closeConfirm}
          onConfirm={handleDelete}
          title="¿Eliminar promoción?"
          description={`Se eliminará la promoción de «${deleting._displayProduct}» de forma permanente. Si ya fue usada en alguna venta, el servidor rechazará la operación.`}
          error={deleteError}
        />
      )}
    </>
  );
}
