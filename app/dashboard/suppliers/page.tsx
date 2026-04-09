"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DataTableColumn } from "@/components/DataTable";
import { DataTable } from "@/components/DataTable";
import { DeleteModal } from "@/components/DeleteModal";
import { GridFilterBar, GridFilterSelect } from "@/components/dashboard";
import { FormModal } from "@/components/FormModal";
import Switch from "@/components/Switch";
import type {
  CreateSupplierRequest,
  SupplierResponse,
} from "@/lib/dashboard-types";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import {
  SEARCH_TABLE_CHUNK_PAGE_SIZE,
  TABLE_SEARCH_DEBOUNCE_MS,
  useLoadAllRemainingPages,
} from "@/lib/useLoadAllRemainingPages";
import {
  useCreateSupplierMutation,
  useDeleteSupplierMutation,
  useGetSuppliersQuery,
  useUpdateSupplierMutation,
} from "./_service/suppliersApi";
import "../products/products-modal.css";
import { toast } from "sonner";
import { SupplierDetailBody } from "@/components/dashboard-detail/entityDetailBodies";
import { withSuppressedMutationToasts } from "@/lib/mutationToastControl";
import { useUserPermissionCodes } from "@/lib/useUserPermissionCodes";

const COLUMNS: DataTableColumn<SupplierResponse>[] = [
  { key: "name", label: "Nombre" },
  { key: "contactPerson", label: "Contacto" },
  { key: "phone", label: "Teléfono" },
  { key: "email", label: "Email" },
  {
    key: "isActive",
    label: "Estado",
    type: "boolean",
    booleanLabels: { true: "Activo", false: "Inactivo" },
  },
  { key: "createdAt", label: "Creado", type: "date" },
];

const initialForm = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
  isActive: true,
};

export default function SuppliersPage() {
  const [page, setPage] = useState(1);
  const [pageSize, _setPageSize] = useState(10);
  const [filterText, setFilterText] = useState("");
  const debouncedFilterText = useDebouncedValue(
    filterText,
    TABLE_SEARCH_DEBOUNCE_MS,
  );
  const [filterActive, setFilterActive] = useState("");
  const perPage = Math.max(pageSize, SEARCH_TABLE_CHUNK_PAGE_SIZE);
  const loadNextPage = useCallback(() => setPage((p) => p + 1), []);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SupplierResponse | null>(null);
  const [form, setForm] = useState(initialForm);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState<SupplierResponse | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const filtersChanged = useRef(false);

  // ─── Permissions ──────────────────────────────────────────────────────────

  const { has: hasPermission } = useUserPermissionCodes();
  const canCreateSupplier = hasPermission("supplier.create");
  const canEditSupplier = hasPermission("supplier.update");
  const canDeleteSupplier = hasPermission("supplier.delete");

  const {
    data: result,
    isLoading,
    isFetching,
  } = useGetSuppliersQuery({ page, perPage });
  const [createSupplier] = useCreateSupplierMutation();
  const [updateSupplier] = useUpdateSupplierMutation();
  const [deleteSupplier] = useDeleteSupplierMutation();

  const [allRows, setAllRows] = useState<SupplierResponse[]>([]);

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
    setFilterActive("");
  };

  const filteredData = useMemo(() => {
    let rows = loadedRows;
    const q = debouncedFilterText.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (row) =>
          String(row.name ?? "")
            .toLowerCase()
            .includes(q) ||
          String(row.contactPerson ?? "")
            .toLowerCase()
            .includes(q),
      );
    }
    if (filterActive === "yes") rows = rows.filter((r) => r.isActive);
    if (filterActive === "no") rows = rows.filter((r) => !r.isActive);
    return rows;
  }, [loadedRows, debouncedFilterText, filterActive]);

  const gridFiltersActive = filterText.trim() !== "" || filterActive !== "";

  const allPagesLoaded =
    result?.pagination != null && page >= (result.pagination.totalPages ?? 1);

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (item: SupplierResponse) => {
    setEditing(item);
    setForm({
      name: item.name,
      contactPerson: item.contactPerson ?? "",
      phone: item.phone ?? "",
      email: item.email ?? "",
      address: item.address ?? "",
      notes: item.notes ?? "",
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
    if (!form.name.trim()) err.name = "El nombre es requerido";
    setFormErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setFormSubmitting(true);
    try {
      const payload: CreateSupplierRequest = {
        name: form.name.trim(),
        contactPerson: form.contactPerson.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        notes: form.notes.trim() || undefined,
        isActive: form.isActive,
      };
      if (editing) {
        await updateSupplier({ id: editing.id, body: payload }).unwrap();
      } else {
        await createSupplier(payload).unwrap();
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

  const openDelete = (item: SupplierResponse) => {
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
      await deleteSupplier(deleting.id).unwrap();
      closeConfirm();
    } catch {
      setDeleteError("Error al eliminar. Intenta de nuevo.");
    }
  };

  const handleBulkDeleteSuppliers = async (ids: number[]) => {
    const tid = toast.loading(`Eliminando ${ids.length} proveedor(es)…`);
    try {
      await withSuppressedMutationToasts(async () => {
        for (const id of ids) {
          await deleteSupplier(id).unwrap();
        }
      });
      toast.success(`${ids.length} proveedor(es) eliminado(s).`, { id: tid });
      setAllRows((prev) => prev.filter((r) => !ids.includes(r.id)));
    } catch {
      toast.error("No se pudieron eliminar todos los proveedores.", {
        id: tid,
      });
    }
  };

  return (
    <>
      <DataTable
        gridConfig={{
          storageKey: "dashboard-suppliers",
          exportFilenamePrefix: "proveedores",
          primaryColumnKey: "name",
          bulkEntityLabel: "proveedores",
        }}
        onBulkDeleteSelected={
          canDeleteSupplier ? handleBulkDeleteSuppliers : undefined
        }
        filters={
          <GridFilterBar onClear={clearGridFilters}>
            <div className="grid-filter-bar__field">
              <span className="grid-filter-bar__label">Buscar</span>
              <input
                type="search"
                className={`grid-filter-bar__control grid-filter-bar__control--wide ${filterText.trim() ? "grid-filter-bar__control--active" : ""}`}
                placeholder="Nombre o contacto…"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </div>
            <div className="grid-filter-bar__field">
              <span className="grid-filter-bar__label">Estado</span>
              <GridFilterSelect
                aria-label="Estado"
                value={filterActive}
                onChange={setFilterActive}
                active={filterActive !== ""}
                className="grid-filter-bar__control--medium"
                options={[
                  { value: "", label: "Todos" },
                  { value: "yes", label: "Activo" },
                  { value: "no", label: "Inactivo" },
                ]}
              />
            </div>
          </GridFilterBar>
        }
        data={filteredData}
        columns={COLUMNS}
        loading={allRows.length === 0 && (isLoading || isFetching)}
        title="Proveedores"
        titleIcon="local_shipping"
        addLabel="Nuevo proveedor"
        onAdd={openCreate}
        addDisabled={!canCreateSupplier}
        actions={[
          {
            icon: "edit",
            label: "Editar",
            onClick: openEdit,
            disabled: () => !canEditSupplier,
          },
          {
            icon: "delete_outline",
            label: "Eliminar",
            onClick: openDelete,
            variant: "danger",
            disabled: () => !canDeleteSupplier,
          },
        ]}
        detailDrawer={{
          entityLabelPlural: "proveedores",
          getTitle: (row) => row.name,
          getStatusBadge: (row) => (
            <span
              className={`dt-tag ${row.isActive ? "dt-tag--green" : "dt-tag--red"}`}
            >
              {row.isActive ? "Activo" : "Inactivo"}
            </span>
          ),
          render: (row) => <SupplierDetailBody row={row} />,
          onEdit: openEdit,
          showEditButton: () => canEditSupplier,
        }}
        infiniteScroll
        hasMore={!allPagesLoaded}
        loadingMore={isFetching && !allPagesLoaded}
        emptyIcon="local_shipping"
        emptyTitle="Sin registros"
        emptyDesc={
          gridFiltersActive && loadedRows.length > 0
            ? "Ningún proveedor coincide con los filtros."
            : "Aún no hay proveedores"
        }
      />

      {formOpen && (
        <FormModal
          open={formOpen}
          onClose={closeForm}
          title={editing ? "Editar proveedor" : "Nuevo proveedor"}
          icon={editing ? "edit" : "local_shipping"}
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
          <div className="modal-field">
            <label htmlFor="contactPerson">Persona de contacto</label>
            <input
              id="contactPerson"
              value={form.contactPerson}
              onChange={(e) =>
                setForm((f) => ({ ...f, contactPerson: e.target.value }))
              }
              placeholder="Nombre"
            />
          </div>
          <div className="modal-field">
            <label htmlFor="phone">Teléfono</label>
            <input
              id="phone"
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value }))
              }
              placeholder="Teléfono"
            />
          </div>
          <div className="modal-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              placeholder="email@ejemplo.com"
            />
          </div>
          <div className="modal-field field-full">
            <label htmlFor="address">Dirección</label>
            <input
              id="address"
              value={form.address}
              onChange={(e) =>
                setForm((f) => ({ ...f, address: e.target.value }))
              }
              placeholder="Dirección"
            />
          </div>
          <div className="modal-field field-full">
            <label htmlFor="notes">Notas</label>
            <textarea
              id="notes"
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              placeholder="Notas"
              rows={3}
            />
          </div>
          <div className="modal-field field-full modal-toggle">
            <Switch
              checked={form.isActive}
              onChange={(checked) =>
                setForm((f) => ({ ...f, isActive: checked }))
              }
            />
            <label htmlFor="isActive">Activo</label>
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
          title="¿Eliminar proveedor?"
          itemName={deleting?.name}
          error={deleteError}
        />
      )}
    </>
  );
}
