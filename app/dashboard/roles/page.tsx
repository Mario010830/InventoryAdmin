"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DataTableColumn } from "@/components/DataTable";
import { DataTable } from "@/components/DataTable";
import { DeleteModal } from "@/components/DeleteModal";
import { RoleDetailBody } from "@/components/dashboard-detail/entityDetailBodies";
import { FormModal } from "@/components/FormModal";
import Switch from "@/components/Switch";
import type { RoleResponse } from "@/lib/dashboard-types";
import {
  buildEntityGroups,
  getOtherPermissions,
  getReadPermission,
  isPermissionHiddenFromRoleEditor,
} from "@/lib/permissions-by-entity";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import {
  SEARCH_TABLE_CHUNK_PAGE_SIZE,
  TABLE_SEARCH_DEBOUNCE_MS,
  useLoadAllRemainingPages,
} from "@/lib/useLoadAllRemainingPages";
import { PERMISSIONS } from "@/lib/utils";
import { useGetUsersQuery } from "../users/_service/usersApi";
import {
  useCreateRoleMutation,
  useDeleteRoleMutation,
  useGetPermissionsQuery,
  useGetRolesQuery,
  useUpdateRoleMutation,
} from "./_service/rolesApi";
import "../products/products-modal.css";
import "./roles-modal.css";
import { toast } from "sonner";
import { GridFilterBar } from "@/components/dashboard";
import { withSuppressedMutationToasts } from "@/lib/mutationToastControl";
import { useUserPermissionCodes } from "@/lib/useUserPermissionCodes";

const COLUMNS: DataTableColumn<RoleResponse>[] = [
  { key: "name", label: "Nombre" },
  { key: "description", label: "Descripcion" },
  {
    key: "isSystem",
    label: "Sistema",
    type: "boolean",
    booleanLabels: { true: "Si", false: "No" },
  },
  { key: "createdAt", label: "Creado", type: "date" },
];

const initialForm: {
  name: string;
  description: string;
  permissions: number[];
} = {
  name: "",
  description: "",
  permissions: [],
};

export default function RolesPage() {
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
  const [editing, setEditing] = useState<RoleResponse | null>(null);
  const [form, setForm] = useState(initialForm);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState<RoleResponse | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const filtersChanged = useRef(false);

  // ─── Permissions ──────────────────────────────────────────────────────────

  const { has: hasPermission } = useUserPermissionCodes();
  const canCreateRole = hasPermission("role.create");
  const canEditRole = hasPermission("role.update");
  const canDeleteRole = hasPermission("role.delete");

  const { data: permissions, isLoading: loadingPermissions } =
    useGetPermissionsQuery();
  const permissionList = useMemo(() => {
    const raw = permissions as
      | {
          result?: {
            id?: number;
            Id?: number;
            code?: string;
            Code?: string;
            name?: string;
            Name?: string;
          }[];
        }
      | undefined;
    const fromApi = Array.isArray(raw?.result) ? raw.result : [];
    /** Unión por id: siempre incluir PERMISSIONS del front + lo que devuelva la API (nombres/códigos de la API tienen prioridad). */
    const byId = new Map<number, { id: number; code: string; name: string }>();
    for (const p of PERMISSIONS) {
      byId.set(p.id, { id: p.id, code: p.code, name: p.name });
    }
    for (const p of fromApi) {
      const id = Number(
        (p as { id?: number; Id?: number }).id ??
          (p as { Id?: number }).Id ??
          0,
      );
      if (!id) continue;
      const code = String(
        (p as { code?: string; Code?: string }).code ??
          (p as { Code?: string }).Code ??
          "",
      ).trim();
      const nameRaw = String(
        (p as { name?: string; Name?: string }).name ??
          (p as { Name?: string }).Name ??
          "",
      ).trim();
      const fallback = PERMISSIONS.find((x) => x.id === id);
      byId.set(id, {
        id,
        code: code || fallback?.code || "",
        name: nameRaw || fallback?.name || code || fallback?.code || String(id),
      });
    }
    return Array.from(byId.values()).sort((a, b) => a.id - b.id);
  }, [permissions]);
  const entityGroups = useMemo(
    () => buildEntityGroups(permissionList),
    [permissionList],
  );
  const {
    data: result,
    isLoading,
    isFetching,
  } = useGetRolesQuery({ page, perPage });
  const { data: usersForRoleCount } = useGetUsersQuery({
    page: 1,
    perPage: 500,
  });
  const usersPerRole = useMemo(() => {
    const m = new Map<number, number>();
    for (const u of usersForRoleCount?.data ?? []) {
      if (u.roleId != null) m.set(u.roleId, (m.get(u.roleId) ?? 0) + 1);
    }
    return m;
  }, [usersForRoleCount?.data]);
  const [createRole] = useCreateRoleMutation();
  const [updateRole] = useUpdateRoleMutation();
  const [deleteRole] = useDeleteRoleMutation();
  const [allRows, setAllRows] = useState<RoleResponse[]>([]);

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

  const _gridFiltersActive = filterText.trim() !== "";

  const allPagesLoaded =
    result?.pagination != null && page >= (result.pagination.totalPages ?? 1);

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setFormErrors({});
    setFormOpen(true);
  };
  const openEdit = (item: RoleResponse) => {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description ?? "",
      permissions: item.permissionIds ?? [],
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
    if (!form.name.trim()) err.name = "Nombre requerido";
    setFormErrors(err);
    return Object.keys(err).length === 0;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setFormSubmitting(true);
    try {
      if (editing)
        await updateRole({
          id: editing.id,
          body: {
            name: form.name.trim(),
            description: form.description.trim() || undefined,
            permissionIds: form.permissions,
          },
        }).unwrap();
      else {
        await createRole({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          permissionIds: form.permissions,
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
  const openDelete = (item: RoleResponse) => {
    if (item.isSystem) return;
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
      await deleteRole(deleting.id).unwrap();
      closeConfirm();
    } catch {
      setDeleteError("Error al eliminar.");
    }
  };

  const handleBulkDeleteRoles = async (ids: number[]) => {
    const tid = toast.loading("Eliminando roles…");
    try {
      await withSuppressedMutationToasts(async () => {
        for (const id of ids) {
          const row = allRows.find((r) => r.id === id);
          if (row?.isSystem) continue;
          await deleteRole(id).unwrap();
        }
      });
      toast.success("Roles eliminados.", { id: tid });
      setAllRows((prev) =>
        prev.filter((r) => !(ids.includes(r.id) && !r.isSystem)),
      );
    } catch {
      toast.error("No se pudieron eliminar todos los roles.", { id: tid });
    }
  };

  const allPermissionIds = useMemo(
    () => permissionList.map((p) => p.id),
    [permissionList],
  );

  const toggleEntityRead = (groupId: string, on: boolean) => {
    const group = entityGroups.find((g) => g.key === groupId);
    if (!group) return;
    const idsToRemove = group.permissions.map((p) => p.id);
    if (groupId === "admin" && on) {
      setForm((f) => ({ ...f, permissions: [...allPermissionIds] }));
      return;
    }
    if (groupId === "admin" && !on) {
      const adminId = group.permissions[0]?.id;
      if (adminId != null)
        setForm((f) => ({
          ...f,
          permissions: f.permissions.filter((id) => id !== adminId),
        }));
      return;
    }
    if (on) {
      const readPerm = getReadPermission(group);
      if (readPerm)
        setForm((f) => ({
          ...f,
          permissions: [
            ...f.permissions.filter((id) => !idsToRemove.includes(id)),
            readPerm.id,
          ],
        }));
    } else {
      setForm((f) => ({
        ...f,
        permissions: f.permissions.filter((id) => !idsToRemove.includes(id)),
      }));
    }
  };

  const togglePermission = (permId: number, checked: boolean) => {
    setForm((f) =>
      checked
        ? { ...f, permissions: [...f.permissions, permId] }
        : { ...f, permissions: f.permissions.filter((id) => id !== permId) },
    );
  };

  return (
    <>
      <DataTable
        gridConfig={{
          storageKey: "dashboard-roles",
          exportFilenamePrefix: "roles",
          primaryColumnKey: "name",
          bulkEntityLabel: "roles",
        }}
        onBulkDeleteSelected={canDeleteRole ? handleBulkDeleteRoles : undefined}
        filters={
          <GridFilterBar onClear={clearGridFilters}>
            <div className="grid-filter-bar__field">
              <span className="grid-filter-bar__label">Nombre del rol</span>
              <input
                type="search"
                className={`grid-filter-bar__control grid-filter-bar__control--wide ${filterText.trim() ? "grid-filter-bar__control--active" : ""}`}
                placeholder="Buscar…"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </div>
          </GridFilterBar>
        }
        data={filteredData}
        columns={COLUMNS}
        loading={allRows.length === 0 && (isLoading || isFetching)}
        title="Roles"
        titleIcon="admin_panel_settings"
        addLabel="Nuevo rol"
        onAdd={openCreate}
        addDisabled={!canCreateRole}
        actions={[
          {
            icon: "edit",
            label: "Editar",
            onClick: openEdit,
            disabled: () => !canEditRole,
          },
          {
            icon: "delete_outline",
            label: "Eliminar",
            onClick: openDelete,
            variant: "danger",
            disabled: (row) => row.isSystem || !canDeleteRole,
          },
        ]}
        detailDrawer={{
          entityLabelPlural: "roles",
          getTitle: (row) => row.name,
          getStatusBadge: (row) => (
            <span
              className={`dt-tag ${row.isSystem ? "dt-tag--red" : "dt-tag--green"}`}
            >
              {row.isSystem ? "Sistema" : "Personalizado"}
            </span>
          ),
          render: (row) => (
            <RoleDetailBody
              row={row}
              userCount={usersPerRole.get(row.id) ?? 0}
              permissionNames={(row.permissionIds ?? [])
                .map((id) => permissionList.find((p) => p.id === id))
                .filter(
                  (p): p is (typeof permissionList)[number] =>
                    p != null && !isPermissionHiddenFromRoleEditor(p.code),
                )
                .map((p) => p.name)}
            />
          ),
          onEdit: openEdit,
          showEditButton: (row) => !row.isSystem && canEditRole,
        }}
        infiniteScroll
        hasMore={!allPagesLoaded}
        loadingMore={isFetching && !allPagesLoaded}
        emptyIcon="admin_panel_settings"
        emptyTitle="Sin registros"
        emptyDesc="Aun no hay roles"
      />
      {formOpen && (
        <FormModal
          open={formOpen}
          onClose={closeForm}
          title={editing ? "Editar rol" : "Nuevo rol"}
          icon={editing ? "edit" : "admin_panel_settings"}
          onSubmit={handleSubmit}
          submitting={formSubmitting}
          submitLabel={editing ? "Guardar" : "Crear"}
          error={formErrors.submit}
          maxWidth="800px"
        >
          <div className="modal-field field-full">
            <label htmlFor="name">Nombre *</label>
            <input
              id="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Nombre del rol"
            />
            {formErrors.name && <p className="form-error">{formErrors.name}</p>}
          </div>
          <div className="modal-field field-full">
            <label htmlFor="description">Descripcion</label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              rows={3}
              placeholder="Descripción del rol"
            />
          </div>
          <div className="modal-field field-full roles-permissions-field">
            <label className="roles-permissions-label">Permisos</label>
            <p className="roles-permissions-hint">
              Activa la vista por entidad y marca las operaciones permitidas.
            </p>
            {loadingPermissions ? (
              <p className="roles-permissions-loading">Cargando permisos...</p>
            ) : (
              <div className="roles-entity-list">
                {entityGroups.map((group) => {
                  const readPerm = getReadPermission(group);
                  const otherPerms = getOtherPermissions(group);
                  const hasRead = readPerm
                    ? form.permissions.includes(readPerm.id)
                    : false;
                  return (
                    <div key={group.key} className="roles-entity-card">
                      <div className="roles-entity-header">
                        <div className="roles-entity-title-wrap">
                          <h4 className="roles-entity-title">{group.label}</h4>
                          {group.description && (
                            <p className="roles-entity-desc">
                              {group.description}
                            </p>
                          )}
                        </div>
                        <Switch
                          checked={hasRead}
                          onChange={(checked) =>
                            toggleEntityRead(group.key, checked)
                          }
                        />
                      </div>
                      {hasRead && otherPerms.length > 0 && (
                        <ul className="roles-entity-ops">
                          {otherPerms.map((p) => (
                            <li key={p.id} className="roles-entity-op">
                              <label className="roles-op-label">
                                <input
                                  type="checkbox"
                                  checked={form.permissions.includes(p.id)}
                                  onChange={(e) =>
                                    togglePermission(p.id, e.target.checked)
                                  }
                                />
                                <span>{p.name}</span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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
          title="Eliminar rol?"
          itemName={deleting?.name}
          error={deleteError}
        />
      )}
    </>
  );
}
