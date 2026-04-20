"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DataTableColumn } from "@/components/DataTable";
import { DataTable } from "@/components/DataTable";
import { DeleteModal } from "@/components/DeleteModal";
import { GridFilterBar, GridFilterSelect } from "@/components/dashboard";
import { PaymentMethodDetailBody } from "@/components/dashboard-detail/entityDetailBodies";
import { FormModal } from "@/components/FormModal";
import Switch from "@/components/Switch";
import type {
  CreatePaymentMethodRequest,
  PaymentMethodResponse,
  UpdatePaymentMethodRequest,
} from "@/lib/dashboard-types";
import { extractRtkQueryErrorFields } from "@/lib/apiBusinessErrors";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import {
  SEARCH_TABLE_CHUNK_PAGE_SIZE,
  TABLE_SEARCH_DEBOUNCE_MS,
  useLoadAllRemainingPages,
} from "@/lib/useLoadAllRemainingPages";
import { useUserPermissionCodes } from "@/lib/useUserPermissionCodes";
import { withSuppressedMutationToasts } from "@/lib/mutationToastControl";
import { toast } from "sonner";
import "../products/products-modal.css";
import {
  useCreatePaymentMethodMutation,
  useDeletePaymentMethodMutation,
  useGetPaymentMethodsQuery,
  useUpdatePaymentMethodMutation,
} from "./_service/paymentMethodsApi";

const NAME_MAX = 120;
const REF_MAX = 120;

const COLUMNS: DataTableColumn<PaymentMethodResponse>[] = [
  { key: "name", label: "Nombre" },
  {
    key: "instrumentReference",
    label: "Referencia",
    render: (row) => row.instrumentReference?.trim() || "—",
  },
  { key: "sortOrder", label: "Orden" },
  {
    key: "isActive",
    label: "Estado",
    type: "boolean",
    booleanLabels: { true: "Activo", false: "Inactivo" },
  },
  { key: "createdAt", label: "Creado", type: "date" },
];

type PaymentMethodFormState = {
  name: string;
  sortOrder: number;
  instrumentReference: string;
  /** Solo se envía al API en edición. */
  isActive: boolean;
};

const emptyForm: PaymentMethodFormState = {
  name: "",
  sortOrder: 0,
  instrumentReference: "",
  isActive: true,
};

export default function PaymentMethodsPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [filterText, setFilterText] = useState("");
  const debouncedFilterText = useDebouncedValue(
    filterText,
    TABLE_SEARCH_DEBOUNCE_MS,
  );
  const [filterActive, setFilterActive] = useState("");
  const perPage = Math.max(pageSize, SEARCH_TABLE_CHUNK_PAGE_SIZE);
  const loadNextPage = useCallback(() => setPage((p) => p + 1), []);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethodResponse | null>(null);
  const [form, setForm] = useState<PaymentMethodFormState>(emptyForm);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState<PaymentMethodResponse | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const filtersChanged = useRef(false);

  const { has: hasPermission } = useUserPermissionCodes();
  const canRead = hasPermission("paymentmethod.read");
  const canCreate = hasPermission("paymentmethod.create");
  const canUpdate = hasPermission("paymentmethod.update");
  const canDelete = hasPermission("paymentmethod.delete");

  const {
    data: result,
    isLoading,
    isFetching,
    error: listError,
  } = useGetPaymentMethodsQuery(
    { page, perPage },
    { skip: !canRead },
  );
  const [createPaymentMethod] = useCreatePaymentMethodMutation();
  const [updatePaymentMethod] = useUpdatePaymentMethodMutation();
  const [deletePaymentMethod] = useDeletePaymentMethodMutation();

  const [allRows, setAllRows] = useState<PaymentMethodResponse[]>([]);

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
  }, [debouncedFilterText, filterActive]);

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
          String(row.instrumentReference ?? "")
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

  const renderMobilePaymentMethodRow = useCallback(
    (row: PaymentMethodResponse) => (
      <div className="dt-mobile-row">
        <div className="dt-mobile-row__body">
          <div className="dt-mobile-row__title">
            {row.name?.trim() || "—"}
          </div>
        </div>
        <span className="dt-mobile-row__end">{row.sortOrder}</span>
      </div>
    ),
    [],
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (item: PaymentMethodResponse) => {
    setEditing(item);
    setForm({
      name: item.name,
      sortOrder: item.sortOrder ?? 0,
      instrumentReference: item.instrumentReference ?? "",
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
    if (form.name.trim().length > NAME_MAX) {
      err.name = `Máximo ${NAME_MAX} caracteres`;
    }
    const refLen = form.instrumentReference.trim().length;
    if (refLen > REF_MAX) {
      err.instrumentReference = `Máximo ${REF_MAX} caracteres`;
    }
    if (typeof form.sortOrder !== "number" || Number.isNaN(form.sortOrder)) {
      err.sortOrder = "Orden inválido";
    }
    setFormErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setFormSubmitting(true);
    try {
      if (editing) {
        const body: UpdatePaymentMethodRequest = {
          name: form.name.trim(),
          sortOrder: form.sortOrder,
          isActive: form.isActive,
          instrumentReference:
            form.instrumentReference.trim() === ""
              ? ""
              : form.instrumentReference.trim(),
        };
        await updatePaymentMethod({ id: editing.id, body }).unwrap();
      } else {
        const payload: CreatePaymentMethodRequest = {
          name: form.name.trim(),
          sortOrder: form.sortOrder,
          instrumentReference:
            form.instrumentReference.trim() === ""
              ? undefined
              : form.instrumentReference.trim(),
        };
        await createPaymentMethod(payload).unwrap();
        setPage(1);
      }
      closeForm();
    } catch (err) {
      const { message } = extractRtkQueryErrorFields(err);
      setFormErrors({
        submit: message ?? (err instanceof Error ? err.message : "Error al guardar"),
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  const openDelete = (item: PaymentMethodResponse) => {
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
      await deletePaymentMethod(deleting.id).unwrap();
      closeConfirm();
    } catch (err) {
      const { message } = extractRtkQueryErrorFields(err);
      setDeleteError(
        message?.trim() ?? "Error al eliminar. Intenta de nuevo.",
      );
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    const tid = toast.loading(`Eliminando ${ids.length} método(s)…`);
    try {
      await withSuppressedMutationToasts(async () => {
        for (const id of ids) {
          await deletePaymentMethod(id).unwrap();
        }
      });
      toast.success(`${ids.length} método(s) eliminado(s).`, { id: tid });
      setAllRows((prev) => prev.filter((r) => !ids.includes(r.id)));
    } catch {
      toast.error("No se pudieron eliminar todos los métodos.", { id: tid });
    }
  };

  if (!canRead) {
    return (
      <div className="dashboard-card" style={{ padding: 24 }}>
        <h1 className="dashboard-page-title">Métodos de pago</h1>
        <p style={{ marginTop: 12, color: "var(--muted-foreground, #666)" }}>
          No tienes permiso para ver esta sección (se requiere{" "}
          <code>paymentmethod.read</code>).
        </p>
      </div>
    );
  }

  return (
    <>
      {listError ? (
        <p className="form-error" style={{ marginBottom: 12 }}>
          No se pudo cargar el listado. Comprueba la sesión o vuelve a intentar.
        </p>
      ) : null}

      <DataTable
        gridConfig={{
          storageKey: "dashboard-payment-methods",
          exportFilenamePrefix: "metodos-pago",
          primaryColumnKey: "name",
          bulkEntityLabel: "métodos de pago",
        }}
        onBulkDeleteSelected={canDelete ? handleBulkDelete : undefined}
        filters={
          <GridFilterBar onClear={clearGridFilters}>
            <div className="grid-filter-bar__field">
              <span className="grid-filter-bar__label">Buscar</span>
              <input
                type="search"
                className={`grid-filter-bar__control grid-filter-bar__control--wide ${filterText.trim() ? "grid-filter-bar__control--active" : ""}`}
                placeholder="Nombre o referencia…"
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
        title="Métodos de pago"
        titleIcon="credit_card"
        addLabel="Nuevo método"
        onAdd={openCreate}
        addDisabled={!canCreate}
        renderMobileRowSummary={renderMobilePaymentMethodRow}
        actions={[
          {
            icon: "edit",
            label: "Editar",
            onClick: openEdit,
            disabled: () => !canUpdate,
          },
          {
            icon: "delete_outline",
            label: "Eliminar",
            onClick: openDelete,
            variant: "danger",
            disabled: () => !canDelete,
          },
        ]}
        detailDrawer={{
          entityLabelPlural: "métodos de pago",
          getTitle: (row) => row.name,
          getStatusBadge: (row) => (
            <span
              className={`dt-tag ${row.isActive ? "dt-tag--green" : "dt-tag--red"}`}
            >
              {row.isActive ? "Activo" : "Inactivo"}
            </span>
          ),
          render: (row) => <PaymentMethodDetailBody row={row} />,
          onEdit: openEdit,
          showEditButton: () => canUpdate,
        }}
        infiniteScroll
        hasMore={!allPagesLoaded}
        loadingMore={isFetching && !allPagesLoaded}
        emptyIcon="credit_card"
        emptyTitle="Sin registros"
        emptyDesc={
          gridFiltersActive && loadedRows.length > 0
            ? "Ningún método coincide con los filtros."
            : "Aún no hay métodos de pago"
        }
      />

      {formOpen && (
        <FormModal
          open={formOpen}
          onClose={closeForm}
          title={editing ? "Editar método de pago" : "Nuevo método de pago"}
          icon={editing ? "edit" : "credit_card"}
          onSubmit={handleSubmit}
          submitting={formSubmitting}
          submitLabel={editing ? "Guardar" : "Crear"}
          error={formErrors.submit}
        >
          <div className="modal-field field-full">
            <label htmlFor="pm-name">Nombre *</label>
            <input
              id="pm-name"
              value={form.name}
              maxLength={NAME_MAX}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="Ej. Efectivo, Transferencia…"
            />
            {formErrors.name && (
              <p className="form-error">{formErrors.name}</p>
            )}
          </div>
          <div className="modal-field">
            <label htmlFor="pm-sort">Orden</label>
            <input
              id="pm-sort"
              type="number"
              value={form.sortOrder}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  sortOrder: Number(e.target.value) || 0,
                }))
              }
            />
            {formErrors.sortOrder && (
              <p className="form-error">{formErrors.sortOrder}</p>
            )}
          </div>
          <div className="modal-field field-full">
            <label htmlFor="pm-ref">Referencia del instrumento</label>
            <input
              id="pm-ref"
              value={form.instrumentReference}
              maxLength={REF_MAX}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  instrumentReference: e.target.value,
                }))
              }
              placeholder="Opcional (p. ej. últimos dígitos)"
            />
            {formErrors.instrumentReference && (
              <p className="form-error">{formErrors.instrumentReference}</p>
            )}
          </div>
          {editing ? (
            <div className="modal-field field-full modal-toggle">
              <Switch
                checked={form.isActive}
                onChange={(checked) =>
                  setForm((f) => ({ ...f, isActive: checked }))
                }
              />
              <span>Activo</span>
            </div>
          ) : null}
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
          title="¿Eliminar método de pago?"
          itemName={deleting?.name}
          error={deleteError}
        />
      )}
    </>
  );
}
