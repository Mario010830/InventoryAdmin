"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import {
  useLoadAllRemainingPages,
  SEARCH_TABLE_CHUNK_PAGE_SIZE,
  TABLE_SEARCH_DEBOUNCE_MS,
} from "@/lib/useLoadAllRemainingPages";
import type { UserResponse } from "@/lib/auth-types";
import type { CreateUserRequest } from "@/lib/dashboard-types";
import { DataTable } from "@/components/DataTable";
import type { DataTableColumn } from "@/components/DataTable";
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} from "./_service/usersApi";
import { useGetLocationsQuery } from "../locations/_service/locationsApi";
import { useGetRolesQuery } from "../roles/_service/rolesApi";
import { DeleteModal } from "@/components/DeleteModal";
import { FormModal } from "@/components/FormModal";
import { useAppSelector } from "@/store/store";
import "../products/products-modal.css";
import { useUserPermissionCodes } from "@/lib/useUserPermissionCodes";
import { toast } from "sonner";
import { withSuppressedMutationToasts } from "@/lib/mutationToastControl";
import { GridFilterBar, GridFilterSelect } from "@/components/dashboard";
import { UserDetailBody } from "@/components/dashboard-detail/entityDetailBodies";
import { UsersBulkToolbar } from "@/components/DataTableBulkToolbar";

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  birthDate: "",
  locationId: 0 as number,
  roleId: 0 as number,
};

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterText, setFilterText] = useState("");
  const debouncedFilterText = useDebouncedValue(filterText, TABLE_SEARCH_DEBOUNCE_MS);
  const [filterRoleId, setFilterRoleId] = useState("");
  const [filterUserStatus, setFilterUserStatus] = useState("");
  const perPage = Math.max(pageSize, SEARCH_TABLE_CHUNK_PAGE_SIZE);
  const loadNextPage = useCallback(() => setPage((p) => p + 1), []);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserResponse | null>(null);
  const [form, setForm] = useState(initialForm);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState<UserResponse | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const filtersChanged = useRef(false);

  const user = useAppSelector((s) => s.auth);
  const organizationId = user?.organizationId ?? 0;
  const isAdmin =
    user?.roleId === 2;

  // ─── Permissions ──────────────────────────────────────────────────────────

  const { has: hasPermission } = useUserPermissionCodes();
  const canCreateUser = hasPermission("user.create");
  const canEditUser = hasPermission("user.update");
  const canDeleteUser = hasPermission("user.delete");

  const { data: result, isLoading, isFetching } = useGetUsersQuery({
    page,
    perPage,
  });
  const { data: locationsResult } = useGetLocationsQuery({
    page: 1,
    perPage: 100,
    organizationId: organizationId || undefined,
  });
  const { data: rolesResult } = useGetRolesQuery({ page: 1, perPage: 100 });

  const [createUser] = useCreateUserMutation();
  const [updateUser] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();

  const locations = locationsResult?.data ?? [];
  const roles = rolesResult?.data ?? [];
  const columns: DataTableColumn<UserResponse>[] = [
    { key: "fullName", label: "Nombre" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Telefono" },
    {
      key: "status",
      label: "Estado",
      sortValue: (row) => (String(row.status ?? "").toUpperCase() === "ACTIVE" ? 1 : 0),
      render: (row) => {
        const isActive = String(row.status ?? "").toUpperCase() === "ACTIVE";
        return (
          <span className={`dt-tag ${isActive ? "dt-tag--green" : "dt-tag--red"}`}>
            {isActive ? "Activo" : "Inactivo"}
          </span>
        );
      },
    },
    isAdmin
      ? {
          key: "organization.name",
          label: "Organizacion",
          sortValue: (row) => row.organization?.name ?? "",
          render: (row) => row.organization?.name ?? "—",
        }
      : {
          key: "location.name",
          label: "Ubicacion",
          sortValue: (row) => row.location?.name ?? "",
          render: (row) => row.location?.name ?? "—",
        },
  ];

  const [allRows, setAllRows] = useState<UserResponse[]>([]);

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
    if (!filtersChanged.current) { filtersChanged.current = true; return; }
    setPage(1);
    setAllRows([]);
  }, [debouncedFilterText, filterRoleId, filterUserStatus]);

  const loadedRows =
    page === 1 && allRows.length === 0 ? (result?.data ?? []) : allRows;

  const clearGridFilters = () => {
    setFilterText("");
    setFilterRoleId("");
    setFilterUserStatus("");
  };

  const filteredData = useMemo(() => {
    let rows = loadedRows;
    const q = debouncedFilterText.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) =>
          String(r.fullName ?? "").toLowerCase().includes(q) ||
          String(r.email ?? "").toLowerCase().includes(q),
      );
    }
    if (filterRoleId !== "") {
      const rid = Number(filterRoleId);
      rows = rows.filter((r) => r.roleId === rid);
    }
    if (filterUserStatus === "active") {
      rows = rows.filter((r) => String(r.status ?? "").toUpperCase() === "ACTIVE");
    }
    if (filterUserStatus === "inactive") {
      rows = rows.filter((r) => String(r.status ?? "").toUpperCase() !== "ACTIVE");
    }
    return rows;
  }, [loadedRows, debouncedFilterText, filterRoleId, filterUserStatus]);

  const gridFiltersActive =
    filterText.trim() !== "" || filterRoleId !== "" || filterUserStatus !== "";

  const allPagesLoaded =
    result?.pagination != null &&
    page >= (result.pagination.totalPages ?? 1);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...initialForm, locationId: 0, roleId: 0 });
    setFormErrors({});
    setFormOpen(true);
  };

  const toDateInputValue = (value: string | null | undefined): string => {
    if (!value || typeof value !== "string") return "";
    const s = value.trim();
    if (!s) return "";
    const iso = s.slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : s;
  };

  const openEdit = (item: UserResponse) => {
    setEditing(item);
    setForm({
      fullName: item.fullName,
      email: item.email,
      phone: item.phone ?? "",
      password: "",
      birthDate: toDateInputValue(item.birthDate),
      locationId: item.locationId ?? 0,
      roleId: item.roleId ?? 0,
    });
    setFormErrors({});
    setFormOpen(true);
  };
  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };
  const validate = (isEdit: boolean) => {
    const err: Record<string, string> = {};
    if (!form.fullName.trim()) err.fullName = "Nombre requerido";
    if (!form.email.trim()) err.email = "Email requerido";
    if (!isEdit && !form.password) err.password = "Contrasena requerida";
    if (!isEdit && form.password.length < 6)
      err.password = "Minimo 6 caracteres";
    setFormErrors(err);
    return Object.keys(err).length === 0;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate(!!editing)) return;
    setFormSubmitting(true);
    try {
      if (editing) {
        await updateUser({
          id: editing.id,
          body: {
            fullName: form.fullName.trim(),
            email: form.email.trim(),
            phone: form.phone.trim() || undefined,
            birthDate: form.birthDate || undefined,
            locationId: form.locationId ?? undefined,
            roleId: form.roleId,
            ...(form.password ? { password: form.password } : {}),
          },
        }).unwrap();
      } else {
        await createUser({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          password: form.password,
          phone: form.phone.trim() || undefined,
          birthDate: form.birthDate || undefined,
          organizationId,
          locationId: form.locationId || undefined,
          roleId: form.roleId || undefined,
        } as CreateUserRequest).unwrap();
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
  const openDelete = (item: UserResponse) => {
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
      await deleteUser(deleting.id).unwrap();
      closeConfirm();
    } catch {
      setDeleteError("Error al eliminar.");
    }
  };

  const activeStatusId = useMemo(() => {
    const row = loadedRows.find((r) => String(r.status ?? "").toUpperCase() === "ACTIVE");
    return row?.statusId;
  }, [loadedRows]);

  const inactiveStatusId = useMemo(() => {
    const row = loadedRows.find((r) => String(r.status ?? "").toUpperCase() !== "ACTIVE");
    return row?.statusId;
  }, [loadedRows]);

  const handleBulkDeleteUsers = async (ids: number[]) => {
    const tid = toast.loading(`Eliminando ${ids.length} usuario(s)…`);
    try {
      await withSuppressedMutationToasts(async () => {
        for (const id of ids) {
          await deleteUser(id).unwrap();
        }
      });
      toast.success(`${ids.length} usuario(s) eliminado(s).`, { id: tid });
      setAllRows((prev) => prev.filter((r) => !ids.includes(r.id)));
    } catch {
      toast.error("No se pudieron eliminar todos los usuarios.", { id: tid });
    }
  };

  const handleBulkSetUserStatus = async (activate: boolean, ids: number[]) => {
    const sid = activate ? activeStatusId : inactiveStatusId;
    if (sid == null) return;
    const tid = toast.loading(
      `${activate ? "Activando" : "Desactivando"} ${ids.length} usuario(s)…`,
    );
    try {
      await withSuppressedMutationToasts(async () => {
        for (const id of ids) {
          await updateUser({ id, body: { statusId: sid } }).unwrap();
        }
      });
      toast.success(
        `${ids.length} usuario(s) ${activate ? "activado(s)" : "desactivado(s)"}.`,
        { id: tid },
      );
      setAllRows((prev) =>
        prev.map((r) =>
          ids.includes(r.id)
            ? { ...r, statusId: sid, status: activate ? "ACTIVE" : "INACTIVE" }
            : r,
        ),
      );
    } catch {
      toast.error("No se pudo actualizar el estado de todos los usuarios.", {
        id: tid,
      });
    }
  };

  return (
    <>
      <DataTable
        gridConfig={{
          storageKey: "dashboard-users",
          exportFilenamePrefix: "usuarios",
          primaryColumnKey: "fullName",
          bulkEntityLabel: "usuarios",
        }}
        renderBulkToolbar={(ctx) => (
          <UsersBulkToolbar
            count={ctx.count}
            onClear={ctx.clearSelection}
            onDeleteSelected={
              canDeleteUser ? () => void handleBulkDeleteUsers(ctx.selectedIds) : undefined
            }
            onActivate={() => void handleBulkSetUserStatus(true, ctx.selectedIds)}
            onDeactivate={() => void handleBulkSetUserStatus(false, ctx.selectedIds)}
            exportSelectedCsv={ctx.exportSelectedCsv}
            exportSelectedXlsx={ctx.exportSelectedXlsx}
            showDelete={canDeleteUser}
            statusActionsDisabled={!canEditUser}
            activateDisabled={activeStatusId == null}
            deactivateDisabled={inactiveStatusId == null}
          />
        )}
        filters={
          <GridFilterBar onClear={clearGridFilters}>
            <div className="grid-filter-bar__field">
              <span className="grid-filter-bar__label">Buscar</span>
              <input
                type="search"
                className={`grid-filter-bar__control grid-filter-bar__control--wide ${filterText.trim() ? "grid-filter-bar__control--active" : ""}`}
                placeholder="Nombre o email…"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </div>
            {roles.length > 0 ? (
              <div className="grid-filter-bar__field">
                <span className="grid-filter-bar__label">Rol</span>
                <GridFilterSelect
                  aria-label="Rol"
                  value={filterRoleId}
                  onChange={setFilterRoleId}
                  active={filterRoleId !== ""}
                  className="grid-filter-bar__control--medium"
                  options={[
                    { value: "", label: "Todos" },
                    ...roles.map((ro) => ({ value: String(ro.id), label: ro.name })),
                  ]}
                />
              </div>
            ) : null}
            <div className="grid-filter-bar__field">
              <span className="grid-filter-bar__label">Estado</span>
              <GridFilterSelect
                aria-label="Estado"
                value={filterUserStatus}
                onChange={setFilterUserStatus}
                active={filterUserStatus !== ""}
                className="grid-filter-bar__control--medium"
                options={[
                  { value: "", label: "Todos" },
                  { value: "active", label: "Activo" },
                  { value: "inactive", label: "Inactivo" },
                ]}
              />
            </div>
          </GridFilterBar>
        }
        data={filteredData}
        columns={columns}
        loading={allRows.length === 0 && (isLoading || isFetching)}
        title="Usuarios"
        titleIcon="group"
        addLabel="Nuevo usuario"
        onAdd={openCreate}
        addDisabled={!canCreateUser}
        actions={[
          { icon: "edit", label: "Editar", onClick: openEdit, disabled: () => !canEditUser },
          { icon: "delete_outline", label: "Eliminar", onClick: openDelete, variant: "danger", disabled: () => !canDeleteUser },
        ]}
        detailDrawer={{
          entityLabelPlural: "usuarios",
          getTitle: (row) => row.fullName,
          getStatusBadge: (row) => {
            const active = String(row.status ?? "").toUpperCase() === "ACTIVE";
            return (
              <span className={`dt-tag ${active ? "dt-tag--green" : "dt-tag--red"}`}>
                {active ? "Activo" : "Inactivo"}
              </span>
            );
          },
          render: (row) => (
            <UserDetailBody
              row={row}
              roleName={roles.find((r) => r.id === row.roleId)?.name ?? "—"}
            />
          ),
          onEdit: openEdit,
          showEditButton: () => canEditUser,
        }}
        infiniteScroll
        hasMore={!allPagesLoaded}
        loadingMore={isFetching && !allPagesLoaded}
        emptyIcon="group"
        emptyTitle="Sin registros"
        emptyDesc="Aun no hay usuarios"
      />
      {formOpen && (
        <FormModal
          open={formOpen}
          onClose={closeForm}
          title={editing ? "Editar usuario" : "Nuevo usuario"}
          icon={editing ? "edit" : "person_add"}
          onSubmit={handleSubmit}
          submitting={formSubmitting}
          submitLabel={editing ? "Guardar" : "Crear"}
          error={formErrors.submit}
        >
          <div className="modal-field field-full">
            <label htmlFor="fullName">Nombre completo *</label>
            <input
              id="fullName"
              value={form.fullName}
              onChange={(e) =>
                setForm((f) => ({ ...f, fullName: e.target.value }))
              }
            />
            {formErrors.fullName && (
              <p className="form-error">{formErrors.fullName}</p>
            )}
          </div>
          <div className="modal-field">
            <label htmlFor="email">Email *</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
            />
            {formErrors.email && (
              <p className="form-error">{formErrors.email}</p>
            )}
          </div>
          <div className="modal-field">
            <label htmlFor="phone">Telefono</label>
            <input
              id="phone"
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value }))
              }
            />
          </div>
          {!editing && (
            <div className="modal-field field-full">
              <label htmlFor="password">Contrasena *</label>
              <input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
              />
              {formErrors.password && (
                <p className="form-error">{formErrors.password}</p>
              )}
            </div>
          )}
          <div className="modal-field">
            <label htmlFor="birthDate">Fecha de nacimiento</label>
            <input
              id="birthDate"
              type="date"
              value={form.birthDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, birthDate: e.target.value }))
              }
            />
          </div>
          <div className="modal-field">
            <label htmlFor="locationId">Ubicacion</label>
            <select
              id="locationId"
              value={form.locationId}
              onChange={(e) =>
                setForm((f) => ({ ...f, locationId: Number(e.target.value) }))
              }
            >
              <option value={0}>Sin asignar</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.code})
                </option>
              ))}
            </select>
          </div>
          <div className="modal-field">
            <label htmlFor="roleId">Rol</label>
            <select
              id="roleId"
              value={form.roleId}
              onChange={(e) =>
                setForm((f) => ({ ...f, roleId: Number(e.target.value) }))
              }
            >
              <option value={0}>Sin asignar</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
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
          title="Eliminar usuario?"
          itemName={deleting?.fullName}
          error={deleteError}
        />
      )}
    </>
  );
}
