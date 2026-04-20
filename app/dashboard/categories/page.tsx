"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DataTableColumn } from "@/components/DataTable";
import { DataTable } from "@/components/DataTable";
import { DeleteModal } from "@/components/DeleteModal";
import { GridFilterBar } from "@/components/dashboard";
import { CategoryDetailBody } from "@/components/dashboard-detail/entityDetailBodies";
import { FormModal } from "@/components/FormModal";
import type { ProductCategoryResponse } from "@/lib/dashboard-types";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import {
  SEARCH_TABLE_CHUNK_PAGE_SIZE,
  TABLE_SEARCH_DEBOUNCE_MS,
  useLoadAllRemainingPages,
} from "@/lib/useLoadAllRemainingPages";
import { useGetProductsQuery } from "../products/_service/productsApi";
import {
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useGetCategoriesQuery,
  useUpdateCategoryMutation,
} from "./_service/categoriesApi";
import "../products/products-modal.css";
import { toast } from "sonner";
import { withSuppressedMutationToasts } from "@/lib/mutationToastControl";
import { useUserPermissionCodes } from "@/lib/useUserPermissionCodes";

const COLUMNS: DataTableColumn<ProductCategoryResponse>[] = [
  { key: "name", label: "Nombre" },
  { key: "description", label: "Descripción" },
  {
    key: "color",
    label: "Color",
    render: (row) => {
      const color = row.color ?? "#6366f1";
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              backgroundColor: color,
              border: "1px solid rgba(0,0,0,0.15)",
              flexShrink: 0,
            }}
            title={color}
          />
        </span>
      );
    },
  },
  { key: "createdAt", label: "Creado", type: "date" },
];

const initialForm = { name: "", description: "", color: "#6366f1" };

export default function CategoriesPage() {
  const [page, setPage] = useState(1);
  const [pageSize, _setPageSize] = useState(10);
  const [filterText, setFilterText] = useState("");
  const debouncedFilterText = useDebouncedValue(
    filterText,
    TABLE_SEARCH_DEBOUNCE_MS,
  );
  const perPage = Math.max(pageSize, SEARCH_TABLE_CHUNK_PAGE_SIZE);
  const loadNextPage = useCallback(() => setPage((p) => p + 1), []);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductCategoryResponse | null>(null);
  const [form, setForm] = useState(initialForm);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState<ProductCategoryResponse | null>(
    null,
  );
  const [deleteError, setDeleteError] = useState("");
  const filtersChanged = useRef(false);

  // ─── Permissions ──────────────────────────────────────────────────────────

  const { has: hasPermission } = useUserPermissionCodes();
  const canCreateCategory = hasPermission("productcategory.create");
  const canEditCategory = hasPermission("productcategory.update");
  const canDeleteCategory = hasPermission("productcategory.delete");

  const {
    data: result,
    isLoading,
    isFetching,
  } = useGetCategoriesQuery({ page, perPage });
  const { data: productsForCount } = useGetProductsQuery({
    page: 1,
    perPage: 500,
  });
  const categoryProductCounts = useMemo(() => {
    const m = new Map<number, number>();
    for (const p of productsForCount?.data ?? []) {
      m.set(p.categoryId, (m.get(p.categoryId) ?? 0) + 1);
    }
    return m;
  }, [productsForCount?.data]);
  const [createCategory] = useCreateCategoryMutation();
  const [updateCategory] = useUpdateCategoryMutation();
  const [deleteCategory] = useDeleteCategoryMutation();

  const [allRows, setAllRows] = useState<ProductCategoryResponse[]>([]);

  // Acumular resultados de páginas (infinite scroll) con deduplicación por id
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

  // Reset al cambiar búsqueda
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

  const clearGridFilters = () => setFilterText("");

  const filteredData = useMemo(() => {
    const q = debouncedFilterText.trim().toLowerCase();
    if (!q) return loadedRows;
    return loadedRows.filter((r) =>
      String(r.name ?? "")
        .toLowerCase()
        .includes(q),
    );
  }, [loadedRows, debouncedFilterText]);

  const gridFiltersActive = filterText.trim() !== "";

  const allPagesLoaded =
    result?.pagination != null && page >= (result.pagination.totalPages ?? 1);

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (item: ProductCategoryResponse) => {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description ?? "",
      color: item.color ?? "#6366f1",
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const validate = () => {
    const err: Record<string, string> = {};
    if (!form.name.trim()) err.name = "El nombre es requerido";
    setFormErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setFormSubmitting(true);
    try {
      if (editing) {
        await updateCategory({
          id: editing.id,
          body: {
            name: form.name.trim(),
            description: form.description.trim() || undefined,
            color: form.color,
          },
        }).unwrap();
      } else {
        await createCategory({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          color: form.color,
        }).unwrap();
        setPage(1);
      }
      closeForm();
    } catch (err) {
      setFormErrors({
        submit: err instanceof Error ? err.message : "Error al guardar",
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  const openDelete = (item: ProductCategoryResponse) => {
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
      await deleteCategory(deleting.id).unwrap();
      closeConfirm();
    } catch {
      setDeleteError("Error al eliminar. Intenta de nuevo.");
    }
  };

  const handleBulkDeleteCategories = async (ids: number[]) => {
    const tid = toast.loading(`Eliminando ${ids.length} categoría(s)…`);
    try {
      await withSuppressedMutationToasts(async () => {
        for (const id of ids) {
          await deleteCategory(id).unwrap();
        }
      });
      toast.success(`${ids.length} categoría(s) eliminada(s).`, { id: tid });
      setAllRows((prev) => prev.filter((r) => !ids.includes(r.id)));
    } catch {
      toast.error("No se pudieron eliminar todas las categorías.", { id: tid });
    }
  };

  const renderMobileCategoryRow = useCallback(
    (row: ProductCategoryResponse) => (
      <div className="dt-mobile-row">
        <div className="dt-mobile-row__body">
          <div className="dt-mobile-row__title">{row.name}</div>
        </div>
      </div>
    ),
    [],
  );

  return (
    <>
      <DataTable
        gridConfig={{
          storageKey: "dashboard-categories",
          exportFilenamePrefix: "categorias",
          primaryColumnKey: "name",
          bulkEntityLabel: "categorías",
        }}
        onBulkDeleteSelected={
          canDeleteCategory ? handleBulkDeleteCategories : undefined
        }
        filters={
          <GridFilterBar onClear={clearGridFilters}>
            <div className="grid-filter-bar__field">
              <span className="grid-filter-bar__label">Nombre</span>
              <input
                type="search"
                className={`grid-filter-bar__control grid-filter-bar__control--wide ${filterText.trim() ? "grid-filter-bar__control--active" : ""}`}
                placeholder="Buscar por nombre…"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </div>
          </GridFilterBar>
        }
        data={filteredData}
        columns={COLUMNS}
        loading={allRows.length === 0 && (isLoading || isFetching)}
        title="Categorías"
        titleIcon="category"
        addLabel="Nueva categoría"
        onAdd={openCreate}
        addDisabled={!canCreateCategory}
        renderMobileRowSummary={renderMobileCategoryRow}
        actions={[
          {
            icon: "edit",
            label: "Editar",
            onClick: openEdit,
            disabled: () => !canEditCategory,
          },
          {
            icon: "delete_outline",
            label: "Eliminar",
            onClick: openDelete,
            variant: "danger",
            disabled: () => !canDeleteCategory,
          },
        ]}
        detailDrawer={{
          entityLabelPlural: "categorías",
          getTitle: (row) => row.name,
          getStatusBadge: () => (
            <span className="dt-tag dt-tag--green">Activo</span>
          ),
          render: (row) => (
            <CategoryDetailBody
              row={row}
              productCount={categoryProductCounts.get(row.id) ?? null}
            />
          ),
          onEdit: openEdit,
          showEditButton: () => canEditCategory,
        }}
        infiniteScroll
        hasMore={!allPagesLoaded}
        loadingMore={isFetching && !allPagesLoaded}
        emptyIcon="category"
        emptyTitle="Sin registros"
        emptyDesc={
          gridFiltersActive && loadedRows.length > 0
            ? "Ninguna categoría coincide con el filtro."
            : "Aún no hay categorías"
        }
      />
      {formOpen && (
        <FormModal
          open={formOpen}
          onClose={closeForm}
          title={editing ? "Editar categoría" : "Nueva categoría"}
          onSubmit={handleSubmit}
          submitting={formSubmitting}
          submitLabel={editing ? "Guardar" : "Crear"}
          error={formErrors.submit}
        >
          <div className="modal-field field-full">
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
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Descripción"
              rows={3}
            />
          </div>
          <div className="modal-field">
            <label htmlFor="color">Color</label>
            <input
              id="color"
              type="color"
              value={form.color}
              onChange={(e) =>
                setForm((f) => ({ ...f, color: e.target.value }))
              }
            />
          </div>
          {formErrors.submit && (
            <p className="form-error" style={{ marginTop: 12 }}>
              {formErrors.submit}
            </p>
          )}
        </FormModal>
      )}
      {confirmOpen && deleting && (
        <DeleteModal
          open={confirmOpen && !!deleting}
          onClose={closeConfirm}
          onConfirm={handleDelete}
          title="¿Eliminar categoría?"
          itemName={deleting?.name}
          error={deleteError}
        />
      )}
    </>
  );
}
