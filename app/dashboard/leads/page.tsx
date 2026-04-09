"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DataTableColumn } from "@/components/DataTable";
import { DataTable } from "@/components/DataTable";
import { DeleteModal } from "@/components/DeleteModal";
import { GridFilterBar, GridFilterSelect } from "@/components/dashboard";
import { FormModal } from "@/components/FormModal";
import type { CreateLeadRequest, LeadResponse } from "@/lib/dashboard-types";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import {
  SEARCH_TABLE_CHUNK_PAGE_SIZE,
  TABLE_SEARCH_DEBOUNCE_MS,
  useLoadAllRemainingPages,
} from "@/lib/useLoadAllRemainingPages";
import { contactsApi } from "../contacts/_service/contactsApi";
import { useGetUsersQuery } from "../users/_service/usersApi";
import {
  useConvertLeadToContactMutation,
  useCreateLeadMutation,
  useDeleteLeadMutation,
  useGetLeadsQuery,
  useUpdateLeadMutation,
} from "./_service/leadsApi";
import "../products/products-modal.css";
import { toast } from "sonner";
import { LeadDetailBody } from "@/components/dashboard-detail/entityDetailBodies";
import { withSuppressedMutationToasts } from "@/lib/mutationToastControl";
import { useUserPermissionCodes } from "@/lib/useUserPermissionCodes";
import { useAppDispatch } from "@/store/store";

const LEAD_STATUSES = [
  "Nuevo",
  "En contacto",
  "Calificado",
  "Propuesta",
  "Ganado",
  "Perdido",
];

const COLUMNS: DataTableColumn<LeadResponse>[] = [
  { key: "name", label: "Nombre", width: "160px" },
  { key: "company", label: "Empresa" },
  { key: "status", label: "Estado", width: "120px" },
  { key: "phone", label: "Teléfono", width: "120px" },
  { key: "email", label: "Email", width: "180px" },
  { key: "origin", label: "Origen" },
  {
    key: "convertedToContactId",
    label: "Convertido",
    width: "100px",
    render: (row) =>
      row.convertedToContactId != null ? (
        <span className="dt-tag dt-tag--green">Sí</span>
      ) : (
        <span className="dt-tag dt-tag--neutral">No</span>
      ),
  },
  { key: "createdAt", label: "Creado", type: "date", width: "120px" },
];

const initialForm = {
  name: "",
  company: "",
  contactPerson: "",
  phone: "",
  email: "",
  origin: "",
  status: "Nuevo",
  notes: "",
  assignedUserId: "" as number | "",
};

export default function LeadsPage() {
  const dispatch = useAppDispatch();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [filterText, setFilterText] = useState("");
  const debouncedFilterText = useDebouncedValue(
    filterText,
    TABLE_SEARCH_DEBOUNCE_MS,
  );
  /** Filtro de estado enviado al API (vacío = todos) */
  const [filterStatusApi, setFilterStatusApi] = useState("");
  /** Filtro local: todos | solo abiertos | solo convertidos */
  const [filterConverted, setFilterConverted] = useState<
    "" | "open" | "converted"
  >("");
  const perPage = Math.max(pageSize, SEARCH_TABLE_CHUNK_PAGE_SIZE);
  const loadNextPage = useCallback(() => setPage((p) => p + 1), []);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LeadResponse | null>(null);
  const [form, setForm] = useState(initialForm);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState<LeadResponse | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [convertTarget, setConvertTarget] = useState<LeadResponse | null>(null);
  const [convertSubmitting, setConvertSubmitting] = useState(false);
  const filtersChanged = useRef(false);

  const { has: hasPermission } = useUserPermissionCodes();
  const canCreateLead = hasPermission("lead.create");
  const canEditLead = hasPermission("lead.update");
  const canDeleteLead = hasPermission("lead.delete");

  const {
    data: result,
    isLoading,
    isFetching,
  } = useGetLeadsQuery({
    page,
    perPage,
    status: filterStatusApi.trim() || undefined,
  });
  const { data: usersPage } = useGetUsersQuery({ page: 1, perPage: 500 });
  const users = usersPage?.data ?? [];
  const userNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const u of users) {
      m.set(u.id, u.fullName?.trim() || u.email || `Usuario #${u.id}`);
    }
    return m;
  }, [users]);

  const [createLead] = useCreateLeadMutation();
  const [updateLead] = useUpdateLeadMutation();
  const [deleteLead] = useDeleteLeadMutation();
  const [convertLeadToContact] = useConvertLeadToContactMutation();

  const [allRows, setAllRows] = useState<LeadResponse[]>([]);

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
    setFilterStatusApi("");
    setFilterConverted("");
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
          String(row.company ?? "")
            .toLowerCase()
            .includes(q) ||
          String(row.contactPerson ?? "")
            .toLowerCase()
            .includes(q) ||
          String(row.email ?? "")
            .toLowerCase()
            .includes(q) ||
          String(row.phone ?? "")
            .toLowerCase()
            .includes(q) ||
          String(row.status ?? "")
            .toLowerCase()
            .includes(q),
      );
    }
    if (filterConverted === "open") {
      rows = rows.filter((r) => r.convertedToContactId == null);
    }
    if (filterConverted === "converted") {
      rows = rows.filter((r) => r.convertedToContactId != null);
    }
    return rows;
  }, [loadedRows, debouncedFilterText, filterConverted]);

  const gridFiltersActive =
    filterText.trim() !== "" ||
    filterStatusApi !== "" ||
    filterConverted !== "";

  const allPagesLoaded =
    result?.pagination != null && page >= (result.pagination.totalPages ?? 1);

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (item: LeadResponse) => {
    if (item.convertedToContactId != null) {
      toast.info("Este lead ya fue convertido a contacto.");
      return;
    }
    setEditing(item);
    setForm({
      name: item.name,
      company: item.company ?? "",
      contactPerson: item.contactPerson ?? "",
      phone: item.phone ?? "",
      email: item.email ?? "",
      origin: item.origin ?? "",
      status: item.status ?? "Nuevo",
      notes: item.notes ?? "",
      assignedUserId: item.assignedUserId != null ? item.assignedUserId : "",
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
      const payload: CreateLeadRequest = {
        name: form.name.trim(),
        company: form.company.trim() || undefined,
        contactPerson: form.contactPerson.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        origin: form.origin.trim() || undefined,
        status: form.status.trim() || undefined,
        notes: form.notes.trim() || undefined,
        assignedUserId:
          form.assignedUserId === "" ? undefined : Number(form.assignedUserId),
      };
      if (editing) {
        await updateLead({ id: editing.id, body: payload }).unwrap();
      } else {
        await createLead(payload).unwrap();
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

  const openDelete = (item: LeadResponse) => {
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
      await deleteLead(deleting.id).unwrap();
      closeConfirm();
    } catch {
      setDeleteError("Error al eliminar. Intenta de nuevo.");
    }
  };

  const openConvert = (row: LeadResponse) => {
    setConvertTarget(row);
  };

  const handleConvertConfirm = async () => {
    if (!convertTarget) return;
    setConvertSubmitting(true);
    try {
      await convertLeadToContact(convertTarget.id).unwrap();
      dispatch(
        contactsApi.util.invalidateTags([{ type: "Contact", id: "LIST" }]),
      );
      toast.success("Lead convertido a contacto.");
      setConvertTarget(null);
      setPage(1);
      setAllRows([]);
    } catch {
      toast.error("No se pudo convertir el lead.");
    } finally {
      setConvertSubmitting(false);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    const tid = toast.loading(`Eliminando ${ids.length} lead(s)…`);
    try {
      await withSuppressedMutationToasts(async () => {
        for (const id of ids) {
          await deleteLead(id).unwrap();
        }
      });
      toast.success(`${ids.length} lead(s) eliminado(s).`, { id: tid });
      setAllRows((prev) => prev.filter((r) => !ids.includes(r.id)));
    } catch {
      toast.error("No se pudieron eliminar todos los leads.", { id: tid });
    }
  };

  const statusOptionsForForm = useMemo(() => {
    const base = [...LEAD_STATUSES];
    if (editing?.status && !base.includes(editing.status)) {
      base.push(editing.status);
    }
    return base.filter((s) => s !== "Convertido");
  }, [editing?.status]);

  return (
    <>
      <DataTable
        gridConfig={{
          storageKey: "dashboard-leads",
          exportFilenamePrefix: "leads",
          primaryColumnKey: "name",
          bulkEntityLabel: "leads",
        }}
        onBulkDeleteSelected={canDeleteLead ? handleBulkDelete : undefined}
        filters={
          <GridFilterBar onClear={clearGridFilters}>
            <div className="grid-filter-bar__field">
              <span className="grid-filter-bar__label">Buscar</span>
              <input
                type="search"
                className={`grid-filter-bar__control grid-filter-bar__control--wide ${filterText.trim() ? "grid-filter-bar__control--active" : ""}`}
                placeholder="Nombre, empresa, email, estado…"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </div>
            <div className="grid-filter-bar__field">
              <span className="grid-filter-bar__label">Estado (API)</span>
              <GridFilterSelect
                aria-label="Estado"
                value={filterStatusApi}
                onChange={setFilterStatusApi}
                active={filterStatusApi !== ""}
                className="grid-filter-bar__control--medium"
                options={[
                  { value: "", label: "Todos" },
                  ...LEAD_STATUSES.map((s) => ({ value: s, label: s })),
                ]}
              />
            </div>
            <div className="grid-filter-bar__field">
              <span className="grid-filter-bar__label">Conversión</span>
              <GridFilterSelect
                aria-label="Conversión"
                value={filterConverted}
                onChange={(v) =>
                  setFilterConverted(v as "" | "open" | "converted")
                }
                active={filterConverted !== ""}
                className="grid-filter-bar__control--medium"
                options={[
                  { value: "", label: "Todos" },
                  { value: "open", label: "Sin convertir" },
                  { value: "converted", label: "Convertidos" },
                ]}
              />
            </div>
          </GridFilterBar>
        }
        data={filteredData}
        columns={COLUMNS}
        loading={allRows.length === 0 && (isLoading || isFetching)}
        title="Leads"
        titleIcon="person_search"
        addLabel="Nuevo lead"
        onAdd={openCreate}
        addDisabled={!canCreateLead}
        actions={[
          {
            icon: "edit",
            label: "Editar",
            onClick: openEdit,
            hidden: (row) => row.convertedToContactId != null,
            disabled: () => !canEditLead,
          },
          {
            icon: "person_add",
            label: "Convertir a contacto",
            onClick: openConvert,
            hidden: (row) => row.convertedToContactId != null,
            disabled: () => !canEditLead,
          },
          {
            icon: "delete_outline",
            label: "Eliminar",
            onClick: openDelete,
            variant: "danger",
            disabled: () => !canDeleteLead,
          },
        ]}
        detailDrawer={{
          entityLabelPlural: "leads",
          getTitle: (row) => row.name,
          getStatusBadge: (row) => (
            <span
              className={`dt-tag ${
                row.convertedToContactId != null
                  ? "dt-tag--green"
                  : "dt-tag--neutral"
              }`}
            >
              {row.convertedToContactId != null ? "Convertido" : row.status}
            </span>
          ),
          render: (row) => (
            <LeadDetailBody
              row={row}
              assignedUserName={
                row.assignedUserId != null
                  ? (userNameById.get(row.assignedUserId) ?? null)
                  : null
              }
            />
          ),
          onEdit: openEdit,
          showEditButton: (row) =>
            canEditLead && row.convertedToContactId == null,
        }}
        infiniteScroll
        hasMore={!allPagesLoaded}
        loadingMore={isFetching && !allPagesLoaded}
        emptyIcon="person_search"
        emptyTitle="Sin registros"
        emptyDesc={
          gridFiltersActive && loadedRows.length > 0
            ? "Ningún lead coincide con los filtros."
            : "Aún no hay leads"
        }
      />

      {formOpen && (
        <FormModal
          open={formOpen}
          onClose={closeForm}
          title={editing ? "Editar lead" : "Nuevo lead"}
          icon={editing ? "edit" : "person_search"}
          onSubmit={handleSubmit}
          submitting={formSubmitting}
          submitLabel={editing ? "Guardar" : "Crear"}
          error={formErrors.submit}
        >
          <div className="modal-field field-full">
            <label htmlFor="l-name">Nombre *</label>
            <input
              id="l-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            {formErrors.name && <p className="form-error">{formErrors.name}</p>}
          </div>
          <div className="modal-field">
            <label htmlFor="l-company">Empresa</label>
            <input
              id="l-company"
              value={form.company}
              onChange={(e) =>
                setForm((f) => ({ ...f, company: e.target.value }))
              }
            />
          </div>
          <div className="modal-field">
            <label htmlFor="l-contactPerson">Persona de contacto</label>
            <input
              id="l-contactPerson"
              value={form.contactPerson}
              onChange={(e) =>
                setForm((f) => ({ ...f, contactPerson: e.target.value }))
              }
            />
          </div>
          <div className="modal-field">
            <label htmlFor="l-phone">Teléfono</label>
            <input
              id="l-phone"
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value }))
              }
            />
          </div>
          <div className="modal-field">
            <label htmlFor="l-email">Email</label>
            <input
              id="l-email"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
            />
          </div>
          <div className="modal-field">
            <label htmlFor="l-origin">Origen</label>
            <input
              id="l-origin"
              value={form.origin}
              onChange={(e) =>
                setForm((f) => ({ ...f, origin: e.target.value }))
              }
            />
          </div>
          <div className="modal-field field-full">
            <label htmlFor="l-status">Estado</label>
            <select
              id="l-status"
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value }))
              }
            >
              {statusOptionsForForm.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="modal-field field-full">
            <label htmlFor="l-notes">Notas</label>
            <textarea
              id="l-notes"
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              rows={3}
            />
          </div>
          <div className="modal-field field-full">
            <label htmlFor="l-assigned">Asignado a</label>
            <select
              id="l-assigned"
              value={
                form.assignedUserId === "" ? "" : String(form.assignedUserId)
              }
              onChange={(e) => {
                const v = e.target.value;
                setForm((f) => ({
                  ...f,
                  assignedUserId: v === "" ? "" : Number(v),
                }));
              }}
            >
              <option value="">— Sin asignar —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName?.trim() || u.email}
                </option>
              ))}
            </select>
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
          title="¿Eliminar lead?"
          itemName={deleting?.name}
          error={deleteError}
        />
      )}

      {convertTarget && (
        <DeleteModal
          open={!!convertTarget}
          onClose={() => setConvertTarget(null)}
          onConfirm={handleConvertConfirm}
          title="¿Convertir lead a contacto?"
          description={`Se creará un nuevo contacto con los datos del lead "${convertTarget.name}".`}
          confirmLabel={convertSubmitting ? "Convirtiendo…" : "Convertir"}
          iconName="person_add"
          confirmVariant="primary"
        />
      )}
    </>
  );
}
