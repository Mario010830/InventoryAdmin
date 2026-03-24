"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import {
  useLoadAllRemainingPages,
  SEARCH_TABLE_CHUNK_PAGE_SIZE,
  TABLE_SEARCH_DEBOUNCE_MS,
} from "@/lib/useLoadAllRemainingPages";
import type { LocationResponse } from "@/lib/auth-types";
import type { CreateLocationRequest, BusinessHoursDto } from "@/lib/dashboard-types";
import { DataTable } from "@/components/DataTable";
import type { DataTableColumn } from "@/components/DataTable";
import {
  useGetLocationsQuery,
  useCreateLocationMutation,
  useUpdateLocationMutation,
  useDeleteLocationMutation,
  useUploadLocationImageMutation,
} from "./_service/locationsApi";
import { useGetBusinessCategoriesQuery } from "./_service/businessCategoryApi";
import { BusinessCategorySelect } from "./BusinessCategorySelect";
import { DeleteModal } from "@/components/DeleteModal";
import { FormModal } from "@/components/FormModal";
import { Icon } from "@/components/ui/Icon";
import { useAppSelector } from "@/store/store";
import "../products/products-modal.css";
import { useUserPermissionCodes } from "@/lib/useUserPermissionCodes";
import { toast } from "sonner";
import { withSuppressedMutationToasts } from "@/lib/mutationToastControl";
import { GridFilterBar, GridFilterSelect } from "@/components/dashboard";
import { BusinessCategoryLucideGlyph } from "@/components/dashboard/BusinessCategoryLucideGlyph";
import "./locations-grid.css";
import { CUBA_PROVINCES, getMunicipalitiesByProvince } from "@/lib/cuba-locations";
import {
  BusinessHoursEditor,
  deserializeBusinessHoursDto,
  makeEmptyBusinessHoursState,
  serializeBusinessHoursState,
  type BusinessHoursFormState,
} from "./BusinessHoursEditor";
import LocationPicker from "./LocationPicker";
import { getProxiedImageSrc } from "@/lib/proxiedImageSrc";
import { LocationDetailBody } from "@/components/dashboard-detail/entityDetailBodies";

function formatAddress(loc: { street?: string | null; municipality?: string | null; province?: string | null }): string {
  const parts = [loc.street, loc.municipality, loc.province].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

const initialForm = {
  name: "",
  code: "",
  description: "",
  whatsAppContact: "",
  photoUrl: "",
  province: "",
  municipality: "",
  street: "",
  latitude: null as number | null,
  longitude: null as number | null,
  businessCategoryId: null as number | null,
};

export default function LocationsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterText, setFilterText] = useState("");
  const [filterBusinessCategoryId, setFilterBusinessCategoryId] = useState("");
  const debouncedFilterText = useDebouncedValue(filterText, TABLE_SEARCH_DEBOUNCE_MS);
  const perPage = Math.max(pageSize, SEARCH_TABLE_CHUNK_PAGE_SIZE);
  const loadNextPage = useCallback(() => setPage((p) => p + 1), []);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LocationResponse | null>(null);
  const [form, setForm] = useState(initialForm);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState<LocationResponse | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteBlockedByApi, setDeleteBlockedByApi] = useState(false);
  const [businessHours, setBusinessHours] = useState<BusinessHoursFormState>(
    makeEmptyBusinessHoursState(),
  );
  const [formLoading, setFormLoading] = useState(false);
  const filtersChanged = useRef(false);
  const formLoadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const user = useAppSelector((s) => s.auth);
  const organizationId = user?.organizationId ?? 0;

  // ─── Permissions ──────────────────────────────────────────────────────────

  const { has: hasPermission } = useUserPermissionCodes();
  const canCreateLocation = hasPermission("location.create");
  const canEditLocation = hasPermission("location.update");
  const canDeleteLocation = hasPermission("location.delete");

  const { data: result, isLoading, isFetching } = useGetLocationsQuery({
    page,
    perPage,
    ...(organizationId ? { organizationId } : {}),
  });
  const [createLocation] = useCreateLocationMutation();
  const [updateLocation] = useUpdateLocationMutation();
  const [deleteLocation] = useDeleteLocationMutation();
  const [uploadLocationImage, { isLoading: uploadingImage }] = useUploadLocationImageMutation();

  const { data: businessCategories = [], isLoading: businessCategoriesLoading } =
    useGetBusinessCategoriesQuery();

  const categoryNameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of businessCategories) m.set(c.id, c.name);
    return m;
  }, [businessCategories]);

  const locationColumns = useMemo((): DataTableColumn<LocationResponse>[] => {
    return [
      {
        key: "photoUrl",
        label: "Foto",
        width: "64px",
        sortable: false,
        exportable: false,
        render: (row) =>
          row.photoUrl ? (
            <img src={getProxiedImageSrc(row.photoUrl) ?? row.photoUrl} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 8 }} />
          ) : (
            <div style={{ width: 40, height: 40, borderRadius: 8, background: "#f1f5f9", display: "grid", placeItems: "center", color: "#94a3b8", fontSize: 20 }}>
              <Icon name="location_on" />
            </div>
          ),
      },
      { key: "name", label: "Nombre" },
      { key: "code", label: "Código", width: "110px" },
      {
        key: "address",
        label: "Dirección",
        width: "200px",
        render: (row) => <span style={{ fontSize: "0.875rem" }}>{formatAddress(row)}</span>,
      },
      { key: "description", label: "Descripción" },
      { key: "organizationName", label: "Organización" },
      { key: "whatsAppContact", label: "WhatsApp", width: "150px" },
      {
        key: "businessCategoryId",
        label: "Tipo de negocio",
        width: "min(220px, 24vw)",
        sortValue: (row) => {
          const id = row.businessCategoryId;
          if (id == null || !Number.isFinite(Number(id))) return "";
          const name = row.businessCategoryName ?? categoryNameById.get(Number(id));
          return name ?? "";
        },
        render: (row) => {
          const id = row.businessCategoryId;
          if (id == null || !Number.isFinite(Number(id))) return <span>—</span>;
          const name = row.businessCategoryName ?? categoryNameById.get(Number(id));
          if (!name) return <span>—</span>;
          return (
            <span className="location-bc-pill">
              <BusinessCategoryLucideGlyph categoryName={name} size={14} strokeWidth={2} />
              <span>{name}</span>
            </span>
          );
        },
      },
      { key: "createdAt", label: "Creado", type: "date" },
    ];
  }, [categoryNameById]);

  const [allRows, setAllRows] = useState<LocationResponse[]>([]);

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
  }, [debouncedFilterText, organizationId, filterBusinessCategoryId]);

  const loadedRows =
    page === 1 && allRows.length === 0 ? (result?.data ?? []) : allRows;

  const clearGridFilters = () => {
    setFilterText("");
    setFilterBusinessCategoryId("");
  };

  const filteredData = useMemo(() => {
    let rows = loadedRows;
    const cid = filterBusinessCategoryId.trim();
    if (cid !== "") {
      const n = Number(cid);
      rows = rows.filter((r) => Number(r.businessCategoryId) === n);
    }
    const q = debouncedFilterText.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        String(row.name ?? "").toLowerCase().includes(q) ||
        String(row.code ?? "").toLowerCase().includes(q),
    );
  }, [loadedRows, debouncedFilterText, filterBusinessCategoryId]);

  const gridFiltersActive = filterText.trim() !== "" || filterBusinessCategoryId !== "";

  const allPagesLoaded =
    result?.pagination != null &&
    page >= (result.pagination.totalPages ?? 1);

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setFormErrors({});
    setBusinessHours(makeEmptyBusinessHoursState());
    setFormOpen(true);
  };

  const openEdit = (item: LocationResponse) => {
    if (formLoadingTimeoutRef.current) {
      clearTimeout(formLoadingTimeoutRef.current);
      formLoadingTimeoutRef.current = null;
    }
    const lat = item.latitude ?? item.coordinates?.lat ?? null;
    const lng = item.longitude ?? item.coordinates?.lng ?? null;
    setEditing(item);
    setForm({
      name: item.name,
      code: item.code,
      description: item.description ?? "",
      whatsAppContact: item.whatsAppContact ?? "",
      photoUrl: item.photoUrl ?? "",
      province: item.province ?? "",
      municipality: item.municipality ?? "",
      street: item.street ?? "",
      latitude: lat,
      longitude: lng,
      businessCategoryId:
        item.businessCategoryId != null && Number.isFinite(Number(item.businessCategoryId))
          ? Number(item.businessCategoryId)
          : null,
    });
    const dto = (item as LocationResponse & { businessHours?: BusinessHoursDto | null })
      .businessHours;
    setBusinessHours(deserializeBusinessHoursDto(dto ?? null));
    setFormErrors({});
    setFormLoading(true);
    setFormOpen(true);
    formLoadingTimeoutRef.current = setTimeout(() => {
      setFormLoading(false);
      formLoadingTimeoutRef.current = null;
    }, 280);
  };

  const closeForm = () => {
    if (formLoadingTimeoutRef.current) {
      clearTimeout(formLoadingTimeoutRef.current);
      formLoadingTimeoutRef.current = null;
    }
    setFormOpen(false);
    setEditing(null);
    setFormLoading(false);
  };

  const validate = (): boolean => {
    const err: Record<string, string> = {};
    if (!form.name.trim()) err.name = "El nombre es requerido";
    if (!form.code.trim()) err.code = "El código es requerido";

    const bhErrors: string[] = [];
    const dayNames: Record<string, string> = {
      monday: "Lunes",
      tuesday: "Martes",
      wednesday: "Miércoles",
      thursday: "Jueves",
      friday: "Viernes",
      saturday: "Sábado",
      sunday: "Domingo",
    };

    const timeToMinutes = (t: string): number => {
      if (!/^\d{2}:\d{2}$/.test(t)) return -1;
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };

    (Object.entries(businessHours) as [keyof BusinessHoursFormState, BusinessHoursFormState[keyof BusinessHoursFormState]][]).forEach(
      ([key, v]) => {
        if (!v.isOpen) return;
        if (!v.open || !v.close) {
          bhErrors.push(`${dayNames[key]}: hora de apertura y cierre son requeridas.`);
          return;
        }
        const start = timeToMinutes(v.open);
        const end = timeToMinutes(v.close);
        if (start < 0 || end < 0 || end <= start) {
          bhErrors.push(
            `${dayNames[key]}: la hora de cierre debe ser posterior a la de apertura.`,
          );
        }
      },
    );

    if (bhErrors.length > 0) {
      err.businessHours = bhErrors.join(" ");
    }

    setFormErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setFormSubmitting(true);
    try {
      const wa = form.whatsAppContact.replace(/\D/g, "").trim() || undefined;
      const hasCoords = form.latitude != null && form.longitude != null;

      const common = {
        name: form.name.trim(),
        code: form.code.trim(),
        description: form.description.trim() || undefined,
        whatsAppContact: wa,
        photoUrl: form.photoUrl.trim() || undefined,
        province: form.province.trim() || undefined,
        municipality: form.municipality.trim() || undefined,
        street: form.street.trim() || undefined,
        latitude: hasCoords ? form.latitude : null,
        longitude: hasCoords ? form.longitude : null,
        coordinates: hasCoords ? { lat: form.latitude!, lng: form.longitude! } : null,
        businessHours: serializeBusinessHoursState(businessHours),
        businessCategoryId: form.businessCategoryId ?? null,
      };

      if (editing) {
        await updateLocation({ id: editing.id, body: common }).unwrap();
      } else {
        await createLocation({ organizationId, ...common }).unwrap();
        setPage(1);
      }
      closeForm();
    } catch (err) {
      setFormErrors({ submit: err instanceof Error ? err.message : "Error al guardar" });
    } finally {
      setFormSubmitting(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setFormErrors((prev) => ({ ...prev, photoUrl: "Máximo 5 MB (JPEG, PNG, GIF o WebP)" }));
      return;
    }
    e.target.value = "";
    try {
      const photoUrl = await uploadLocationImage(file).unwrap();
      setForm((f) => ({ ...f, photoUrl }));
      setFormErrors((prev) => ({ ...prev, photoUrl: "" }));
    } catch {
      setFormErrors((prev) => ({ ...prev, photoUrl: "Error al subir la imagen" }));
    }
  };

  const openDelete = (item: LocationResponse) => {
    setDeleting(item);
    setDeleteError("");
    setDeleteBlockedByApi(false);
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    setConfirmOpen(false);
    setDeleting(null);
    setDeleteError("");
    setDeleteBlockedByApi(false);
  };

  const handleBulkDeleteLocations = async (ids: number[]) => {
    const tid = toast.loading(`Eliminando ${ids.length} ubicación(es)…`);
    try {
      await withSuppressedMutationToasts(async () => {
        for (const id of ids) {
          await deleteLocation(id).unwrap();
        }
      });
      toast.success(`${ids.length} ubicación(es) eliminada(s).`, { id: tid });
      setAllRows((prev) => prev.filter((r) => !ids.includes(r.id)));
    } catch {
      toast.error("No se pudieron eliminar todas las ubicaciones.", { id: tid });
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteError("");
    try {
      await deleteLocation(deleting.id).unwrap();
      closeConfirm();
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      const data = (err as { data?: { message?: string; Message?: string } })?.data;
      const msg = data?.message ?? data?.Message ?? "";
      const isInUse =
        status === 400 ||
        (typeof msg === "string" &&
          (msg.includes("en uso") || msg.includes("ventas") || msg.includes("devoluciones") || msg.includes("LocationInUse")));
      if (isInUse) {
        setDeleteBlockedByApi(true);
        setDeleteError("No se puede eliminar esta ubicación porque tiene ventas o devoluciones asociadas.");
      } else {
        setDeleteError("Error al eliminar. Intenta de nuevo.");
      }
    }
  };

  return (
    <>
      <DataTable
        gridConfig={{
          storageKey: "dashboard-locations",
          exportFilenamePrefix: "ubicaciones",
          primaryColumnKey: "name",
          bulkEntityLabel: "ubicaciones",
        }}
        onBulkDeleteSelected={canDeleteLocation ? handleBulkDeleteLocations : undefined}
        filters={
          <GridFilterBar onClear={clearGridFilters}>
            <div className="grid-filter-bar__field">
              <span className="grid-filter-bar__label">Nombre / código</span>
              <input
                type="search"
                className={`grid-filter-bar__control grid-filter-bar__control--wide ${filterText.trim() ? "grid-filter-bar__control--active" : ""}`}
                placeholder="Buscar…"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </div>
            <div className="grid-filter-bar__field">
              <span className="grid-filter-bar__label">Tipo de negocio</span>
              <GridFilterSelect
                aria-label="Filtrar por tipo de negocio"
                value={filterBusinessCategoryId}
                onChange={setFilterBusinessCategoryId}
                options={[
                  { value: "", label: "Todas" },
                  ...businessCategories.map((c) => ({ value: String(c.id), label: c.name })),
                ]}
                placeholder="Todas"
                active={filterBusinessCategoryId !== ""}
                className="!min-w-[168px]"
              />
            </div>
          </GridFilterBar>
        }
        data={filteredData}
        columns={locationColumns}
        loading={allRows.length === 0 && (isLoading || isFetching)}
        title="Ubicaciones"
        titleIcon="warehouse"
        addLabel="Nueva ubicación"
        onAdd={openCreate}
        addDisabled={!canCreateLocation}
        actions={[
          { icon: "edit", label: "Editar", onClick: openEdit, disabled: () => !canEditLocation },
          { icon: "delete_outline", label: "Eliminar", onClick: openDelete, variant: "danger", disabled: () => !canDeleteLocation },
        ]}
        detailDrawer={{
          entityLabelPlural: "ubicaciones",
          getTitle: (row) => row.name,
          getStatusBadge: () => <span className="dt-tag dt-tag--green">Activo</span>,
          render: (row) => <LocationDetailBody row={row} />,
          onEdit: openEdit,
          showEditButton: () => canEditLocation,
        }}
        infiniteScroll
        hasMore={!allPagesLoaded}
        loadingMore={isFetching && !allPagesLoaded}
        emptyIcon="warehouse"
        emptyTitle="Sin registros"
        emptyDesc={
          gridFiltersActive && loadedRows.length > 0
            ? "Ninguna ubicación coincide con el filtro."
            : "Aún no hay ubicaciones"
        }
      />

      {formOpen && (
        <FormModal
          open={formOpen}
          onClose={closeForm}
          title={editing ? "Editar ubicación" : "Nueva ubicación"}
          icon={editing ? "edit" : "warehouse"}
          maxWidth="720px"
          onSubmit={handleSubmit}
          submitting={formSubmitting}
          loading={formLoading}
          submitLabel={editing ? "Guardar" : "Crear"}
          error={formErrors.submit}
        >
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
          <BusinessCategorySelect
            value={form.businessCategoryId}
            onChange={(id) => setForm((f) => ({ ...f, businessCategoryId: id }))}
            categories={businessCategories}
            loading={businessCategoriesLoading}
            disabled={editing ? !canEditLocation : !canCreateLocation}
          />
          <div className="modal-field field-full">
            <label>Foto de la ubicación</label>
            <input type="hidden" value={form.photoUrl} readOnly />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleUploadPhoto}
              style={{ display: "none" }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              {form.photoUrl ? (
                <>
                  <img src={getProxiedImageSrc(form.photoUrl) ?? form.photoUrl} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8 }} />
                  <div>
                    <button type="button" className="modal-btn modal-btn--secondary" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage}>
                      {uploadingImage ? "Subiendo…" : "Cambiar foto"}
                    </button>
                    <button type="button" className="modal-btn" style={{ marginLeft: 8 }} onClick={() => setForm((f) => ({ ...f, photoUrl: "" }))}>
                      Quitar
                    </button>
                  </div>
                </>
              ) : (
                <button type="button" className="modal-btn modal-btn--secondary" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage}>
                  {uploadingImage ? "Subiendo…" : "Subir foto"}
                </button>
              )}
            </div>
            <p style={{ fontSize: "0.74rem", color: "#94a3b8", marginTop: 4 }}>JPEG, PNG, GIF o WebP. Máx. 5 MB.</p>
            {formErrors.photoUrl && <p className="form-error">{formErrors.photoUrl}</p>}
          </div>
          <div className="modal-field">
            <label htmlFor="street">Calle / Dirección</label>
            <input
              id="street"
              value={form.street}
              onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
              placeholder="Calle Mayor 1"
            />
          </div>
          <div className="modal-field">
            <label htmlFor="province">Provincia</label>
            <select
              id="province"
              value={form.province}
              onChange={(e) => {
                const province = e.target.value;
                const municipalities = getMunicipalitiesByProvince(province);
                const currentMunicipality = form.municipality;
                const keepMunicipality = currentMunicipality && municipalities.includes(currentMunicipality);
                setForm((f) => ({
                  ...f,
                  province,
                  municipality: keepMunicipality ? currentMunicipality : "",
                }));
              }}
            >
              <option value="">Seleccione provincia</option>
              {CUBA_PROVINCES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="modal-field">
            <label htmlFor="municipality">Municipio</label>
            <select
              id="municipality"
              value={form.province ? (getMunicipalitiesByProvince(form.province).includes(form.municipality) ? form.municipality : "") : ""}
              onChange={(e) => setForm((f) => ({ ...f, municipality: e.target.value }))}
              disabled={!form.province}
            >
              <option value="">Seleccione municipio</option>
              {getMunicipalitiesByProvince(form.province).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="modal-field field-full">
            <label htmlFor="whatsAppContact">WhatsApp de contacto</label>
            <input
              id="whatsAppContact"
              type="tel"
              value={form.whatsAppContact}
              onChange={(e) => setForm((f) => ({ ...f, whatsAppContact: e.target.value }))}
              placeholder="5215512345678"
            />
            <p style={{ fontSize: "0.74rem", color: "#94a3b8", marginTop: 4 }}>
              Código de país + número, sin <code>+</code> ni espacios.&nbsp;
              Ej: <strong>5215512345678</strong> (México). Se usa para el enlace de pedidos por WhatsApp.
            </p>
            {formErrors.whatsAppContact && (
              <p className="form-error">{formErrors.whatsAppContact}</p>
            )}
          </div>

          {/* Sección avanzada: mapa + horario */}
          <section
            style={{
              marginTop: 16,
              paddingTop: 12,
              borderTop: "1px solid #e5e7eb",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div>
              <h3 style={{ fontSize: "0.9rem", fontWeight: 600, margin: 0, color: "#0f172a" }}>
                Ubicación en el mapa
              </h3>
              <p style={{ fontSize: "0.78rem", color: "#6b7280", margin: "4px 0 0" }}>
                Buscá la dirección de tu tienda para que los clientes puedan encontrarla fácilmente. Este campo es opcional.
              </p>
            </div>
            <LocationPicker
              value={
                form.latitude != null && form.longitude != null
                  ? { lat: form.latitude, lng: form.longitude }
                  : null
              }
              onChange={(coords: { lat: number; lng: number } | null) =>
                setForm((f) => ({
                  ...f,
                  latitude: coords?.lat ?? null,
                  longitude: coords?.lng ?? null,
                }))
              }
            />

            <div style={{ marginTop: 8 }}>
              <h3 style={{ fontSize: "0.9rem", fontWeight: 600, margin: 0, color: "#0f172a" }}>
                Horario de atención
              </h3>
              <p style={{ fontSize: "0.78rem", color: "#6b7280", margin: "4px 0 0" }}>
                Definí los horarios de apertura y cierre por día. Si no configuras nada, la tienda se considerará sin horario fijo.
              </p>
            </div>
            <BusinessHoursEditor value={businessHours} onChange={setBusinessHours} />
            {formErrors.businessHours && (
              <p className="form-error" style={{ marginTop: 4 }}>
                {formErrors.businessHours}
              </p>
            )}
          </section>
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
          onConfirm={deleteBlockedByApi ? closeConfirm : handleDelete}
          title={deleteBlockedByApi ? "No se puede eliminar" : "¿Eliminar ubicación?"}
          itemName={deleting?.name}
          description={
            deleteBlockedByApi
              ? deleteError
              : "Al eliminar esta ubicación: los usuarios asignados quedarán sin ubicación; se eliminarán todos los movimientos de inventario y todo el stock de esta ubicación. ¿Deseas continuar?"
          }
          error={deleteBlockedByApi ? "" : deleteError}
          confirmLabel={deleteBlockedByApi ? "Entendido" : "Eliminar"}
          singleAction={deleteBlockedByApi}
        />
      )}
    </>
  );
}
