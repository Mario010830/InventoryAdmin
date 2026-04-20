"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DataTableColumn } from "@/components/DataTable";
import { DataTable } from "@/components/DataTable";
import { DeleteModal } from "@/components/DeleteModal";
import { GridFilterBar, GridFilterSelect } from "@/components/dashboard";
import { FormModal } from "@/components/FormModal";
import Switch from "@/components/Switch";
import type {
  ContactResponse,
  CreateContactRequest,
} from "@/lib/dashboard-types";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import {
  SEARCH_TABLE_CHUNK_PAGE_SIZE,
  TABLE_SEARCH_DEBOUNCE_MS,
  useLoadAllRemainingPages,
} from "@/lib/useLoadAllRemainingPages";
import { useGetUsersQuery } from "../users/_service/usersApi";
import {
  useCreateContactMutation,
  useDeleteContactMutation,
  useGetContactsQuery,
  useUpdateContactMutation,
} from "./_service/contactsApi";
import "../products/products-modal.css";
import { toast } from "sonner";
import { ContactDetailBody } from "@/components/dashboard-detail/entityDetailBodies";
import { withSuppressedMutationToasts } from "@/lib/mutationToastControl";
import { useUserPermissionCodes } from "@/lib/useUserPermissionCodes";

const COLUMNS: DataTableColumn<ContactResponse>[] = [
  { key: "name", label: "Nombre", width: "160px" },
  { key: "company", label: "Empresa" },
  { key: "contactPerson", label: "Contacto" },
  { key: "phone", label: "Teléfono", width: "120px" },
  { key: "email", label: "Email", width: "180px" },
  { key: "origin", label: "Origen" },
  {
    key: "isActive",
    label: "Estado",
    type: "boolean",
    booleanLabels: { true: "Activo", false: "Inactivo" },
    width: "96px",
  },
  { key: "createdAt", label: "Creado", type: "date", width: "120px" },
];

const initialForm = {
  name: "",
  company: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
  origin: "",
  isActive: true,
  assignedUserId: "" as number | "",
};

export default function ContactsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, _setPageSize] = useState(10);
  const [filterText, setFilterText] = useState("");
  const debouncedFilterText = useDebouncedValue(
    filterText,
    TABLE_SEARCH_DEBOUNCE_MS,
  );
  const [filterActive, setFilterActive] = useState("");
  const [filterOrigin, setFilterOrigin] = useState("");
  const perPage = Math.max(pageSize, SEARCH_TABLE_CHUNK_PAGE_SIZE);
  const loadNextPage = useCallback(() => setPage((p) => p + 1), []);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ContactResponse | null>(null);
  const [form, setForm] = useState(initialForm);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState<ContactResponse | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const filtersChanged = useRef(false);

  const { has: hasPermission } = useUserPermissionCodes();
  const canCreateContact = hasPermission("contact.create");
  const canEditContact = hasPermission("contact.update");
  const canDeleteContact = hasPermission("contact.delete");

  const {
    data: result,
    isLoading,
    isFetching,
  } = useGetContactsQuery({ page, perPage });
  const { data: usersPage } = useGetUsersQuery({ page: 1, perPage: 500 });
  const users = usersPage?.data ?? [];
  const userNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const u of users) {
      m.set(u.id, u.fullName?.trim() || u.email || `Usuario #${u.id}`);
    }
    return m;
  }, [users]);

  const [createContact] = useCreateContactMutation();
  const [updateContact] = useUpdateContactMutation();
  const [deleteContact] = useDeleteContactMutation();

  const [allRows, setAllRows] = useState<ContactResponse[]>([]);

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

  const originOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of loadedRows) {
      const o = r.origin?.trim();
      if (o) set.add(o);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [loadedRows]);

  const clearGridFilters = () => {
    setFilterText("");
    setFilterActive("");
    setFilterOrigin("");
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
            .includes(q),
      );
    }
    if (filterActive === "yes") rows = rows.filter((r) => r.isActive);
    if (filterActive === "no") rows = rows.filter((r) => !r.isActive);
    if (filterOrigin !== "")
      rows = rows.filter((r) => (r.origin ?? "").trim() === filterOrigin);
    return rows;
  }, [loadedRows, debouncedFilterText, filterActive, filterOrigin]);

  const gridFiltersActive =
    filterText.trim() !== "" || filterActive !== "" || filterOrigin !== "";

  const allPagesLoaded =
    result?.pagination != null && page >= (result.pagination.totalPages ?? 1);

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (item: ContactResponse) => {
    setEditing(item);
    setForm({
      name: item.name,
      company: item.company ?? "",
      contactPerson: item.contactPerson ?? "",
      phone: item.phone ?? "",
      email: item.email ?? "",
      address: item.address ?? "",
      notes: item.notes ?? "",
      origin: item.origin ?? "",
      isActive: item.isActive,
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
      const payload: CreateContactRequest = {
        name: form.name.trim(),
        company: form.company.trim() || undefined,
        contactPerson: form.contactPerson.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        notes: form.notes.trim() || undefined,
        origin: form.origin.trim() || undefined,
        isActive: form.isActive,
        assignedUserId:
          form.assignedUserId === "" ? undefined : Number(form.assignedUserId),
      };
      if (editing) {
        await updateContact({ id: editing.id, body: payload }).unwrap();
      } else {
        await createContact(payload).unwrap();
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

  const openDelete = (item: ContactResponse) => {
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
      await deleteContact(deleting.id).unwrap();
      closeConfirm();
    } catch {
      setDeleteError("Error al eliminar. Intenta de nuevo.");
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    const tid = toast.loading(`Eliminando ${ids.length} contacto(s)…`);
    try {
      await withSuppressedMutationToasts(async () => {
        for (const id of ids) {
          await deleteContact(id).unwrap();
        }
      });
      toast.success(`${ids.length} contacto(s) eliminado(s).`, { id: tid });
      setAllRows((prev) => prev.filter((r) => !ids.includes(r.id)));
    } catch {
      toast.error("No se pudieron eliminar todos los contactos.", { id: tid });
    }
  };

  const renderMobileContactRow = useCallback((row: ContactResponse) => {
    const name = row.name?.trim() || "—";
    const company = row.company?.trim();
    const phone = row.phone?.trim();
    const line1 = company || phone || "—";
    const email = row.email?.trim();
    const meta = email ? `${line1} · ${email}` : line1;
    return (
      <div className="dt-mobile-row">
        <div className="dt-mobile-row__body">
          <div className="dt-mobile-row__title" title={name}>
            {name}
          </div>
          <div className="dt-mobile-row__meta" title={meta}>
            {meta}
          </div>
        </div>
      </div>
    );
  }, []);

  return (
    <>
      <DataTable
        gridConfig={{
          storageKey: "dashboard-contacts",
          exportFilenamePrefix: "contactos",
          primaryColumnKey: "name",
          bulkEntityLabel: "contactos",
        }}
        onBulkDeleteSelected={canDeleteContact ? handleBulkDelete : undefined}
        filters={
          <GridFilterBar onClear={clearGridFilters}>
            <div className="grid-filter-bar__field">
              <span className="grid-filter-bar__label">Buscar</span>
              <input
                type="search"
                className={`grid-filter-bar__control grid-filter-bar__control--wide ${filterText.trim() ? "grid-filter-bar__control--active" : ""}`}
                placeholder="Nombre, empresa, email, teléfono…"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </div>
            <div className="grid-filter-bar__field">
              <span className="grid-filter-bar__label">Origen</span>
              <GridFilterSelect
                aria-label="Origen"
                value={filterOrigin}
                onChange={setFilterOrigin}
                active={filterOrigin !== ""}
                className="grid-filter-bar__control--medium"
                options={[
                  { value: "", label: "Todos" },
                  ...originOptions.map((o) => ({ value: o, label: o })),
                ]}
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
        title="Contactos"
        titleIcon="contacts"
        addLabel="Nuevo contacto"
        onAdd={openCreate}
        addDisabled={!canCreateContact}
        renderMobileRowSummary={renderMobileContactRow}
        actions={[
          {
            icon: "edit",
            label: "Editar",
            onClick: openEdit,
            disabled: () => !canEditContact,
          },
          {
            icon: "delete_outline",
            label: "Eliminar",
            onClick: openDelete,
            variant: "danger",
            disabled: () => !canDeleteContact,
          },
        ]}
        detailDrawer={{
          entityLabelPlural: "contactos",
          getTitle: (row) => row.name,
          getStatusBadge: (row) => (
            <span
              className={`dt-tag ${row.isActive ? "dt-tag--green" : "dt-tag--red"}`}
            >
              {row.isActive ? "Activo" : "Inactivo"}
            </span>
          ),
          render: (row) => (
            <ContactDetailBody
              row={row}
              assignedUserName={
                row.assignedUserId != null
                  ? (userNameById.get(row.assignedUserId) ?? null)
                  : null
              }
            />
          ),
          onEdit: openEdit,
          showEditButton: () => canEditContact,
        }}
        infiniteScroll
        hasMore={!allPagesLoaded}
        loadingMore={isFetching && !allPagesLoaded}
        emptyIcon="contacts"
        emptyTitle="Sin registros"
        emptyDesc={
          gridFiltersActive && loadedRows.length > 0
            ? "Ningún contacto coincide con los filtros."
            : "Aún no hay contactos"
        }
      />

      {formOpen && (
        <FormModal
          open={formOpen}
          onClose={closeForm}
          title={editing ? "Editar contacto" : "Nuevo contacto"}
          icon={editing ? "edit" : "contacts"}
          onSubmit={handleSubmit}
          submitting={formSubmitting}
          submitLabel={editing ? "Guardar" : "Crear"}
          error={formErrors.submit}
        >
          <div className="modal-field field-full">
            <label htmlFor="c-name">Nombre *</label>
            <input
              id="c-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Nombre"
            />
            {formErrors.name && <p className="form-error">{formErrors.name}</p>}
          </div>
          <div className="modal-field">
            <label htmlFor="c-company">Empresa</label>
            <input
              id="c-company"
              value={form.company}
              onChange={(e) =>
                setForm((f) => ({ ...f, company: e.target.value }))
              }
            />
          </div>
          <div className="modal-field">
            <label htmlFor="c-contactPerson">Persona de contacto</label>
            <input
              id="c-contactPerson"
              value={form.contactPerson}
              onChange={(e) =>
                setForm((f) => ({ ...f, contactPerson: e.target.value }))
              }
            />
          </div>
          <div className="modal-field">
            <label htmlFor="c-phone">Teléfono</label>
            <input
              id="c-phone"
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value }))
              }
            />
          </div>
          <div className="modal-field">
            <label htmlFor="c-email">Email</label>
            <input
              id="c-email"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
            />
          </div>
          <div className="modal-field field-full">
            <label htmlFor="c-address">Dirección</label>
            <input
              id="c-address"
              value={form.address}
              onChange={(e) =>
                setForm((f) => ({ ...f, address: e.target.value }))
              }
            />
          </div>
          <div className="modal-field field-full">
            <label htmlFor="c-origin">Origen</label>
            <input
              id="c-origin"
              value={form.origin}
              onChange={(e) =>
                setForm((f) => ({ ...f, origin: e.target.value }))
              }
              placeholder="Web, feria, referido…"
            />
          </div>
          <div className="modal-field field-full">
            <label htmlFor="c-notes">Notas</label>
            <textarea
              id="c-notes"
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              rows={3}
            />
          </div>
          <div className="modal-field field-full">
            <label htmlFor="c-assigned">Asignado a</label>
            <select
              id="c-assigned"
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
          <div className="modal-field field-full modal-toggle">
            <Switch
              checked={form.isActive}
              onChange={(checked) =>
                setForm((f) => ({ ...f, isActive: checked }))
              }
            />
            <label>Activo</label>
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
          title="¿Eliminar contacto?"
          itemName={deleting?.name}
          error={deleteError}
        />
      )}
    </>
  );
}
