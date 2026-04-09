"use client";

import { Pencil } from "lucide-react";
import { useMemo, useState } from "react";
import {
  useGetBusinessCategoriesQuery,
  useUpdateBusinessCategoryMutation,
} from "@/app/dashboard/locations/_service/businessCategoryApi";
import { BusinessCategoryLucideGlyph } from "@/components/dashboard/BusinessCategoryLucideGlyph";
import { FormModal } from "@/components/FormModal";
import Switch from "@/components/Switch";
import type { BusinessCategoryResponse } from "@/lib/dashboard-types";
import { useUserPermissionCodes } from "@/lib/useUserPermissionCodes";
import "../products/products-modal.css";
import "./business-categories.css";

export default function BusinessCategoriesPage() {
  const { has } = useUserPermissionCodes();
  const canRead = has("setting.read");
  const canUpdate = has("setting.update");

  const { data: categories = [], isLoading } = useGetBusinessCategoriesQuery(
    undefined,
    {
      skip: !canRead,
    },
  );
  const [updateCategory, { isLoading: saving }] =
    useUpdateBusinessCategoryMutation();

  const sorted = useMemo(
    () => [...categories].sort((a, b) => a.name.localeCompare(b.name, "es")),
    [categories],
  );

  const [editing, setEditing] = useState<BusinessCategoryResponse | null>(null);
  const [editName, setEditName] = useState("");
  const [submitError, setSubmitError] = useState("");

  const openEdit = (c: BusinessCategoryResponse) => {
    setEditing(c);
    setEditName(c.name);
    setSubmitError("");
  };

  const closeEdit = () => {
    setEditing(null);
    setEditName("");
    setSubmitError("");
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || !canUpdate) return;
    const name = editName.trim();
    if (!name) {
      setSubmitError("El nombre es requerido");
      return;
    }
    if (name === editing.name) {
      closeEdit();
      return;
    }
    setSubmitError("");
    try {
      await updateCategory({ id: editing.id, body: { name } }).unwrap();
      closeEdit();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error al guardar");
    }
  };

  if (!canRead) {
    return (
      <div className="business-cat-admin-page">
        <p className="business-cat-admin-page__denied">
          No tienes permiso para ver esta sección.
        </p>
      </div>
    );
  }

  return (
    <div className="business-cat-admin-page">
      <header className="business-cat-admin-page__header">
        <h1 className="business-cat-admin-page__title">
          Categorías de negocio
        </h1>
        <p className="business-cat-admin-page__subtitle">
          Iconos y nombres en ubicaciones. Activá o desactivá cada categoría
          según corresponda.
        </p>
      </header>

      {isLoading ? (
        <p className="business-cat-admin-page__loading">Cargando…</p>
      ) : (
        <div className="business-cat-admin-grid">
          {sorted.map((c) => {
            const active = c.isActive ?? true;
            return (
              <article key={c.id} className="business-cat-admin-card">
                <div className="business-cat-admin-card__icon" aria-hidden>
                  <BusinessCategoryLucideGlyph
                    categoryName={c.name}
                    size={32}
                    strokeWidth={1.75}
                  />
                </div>
                <h2 className="business-cat-admin-card__name">{c.name}</h2>
                <div className="business-cat-admin-card__row">
                  <span className="business-cat-admin-card__label">Activa</span>
                  <Switch
                    checked={active}
                    onChange={(next) => {
                      if (!canUpdate || saving) return;
                      void updateCategory({
                        id: c.id,
                        body: { isActive: next },
                      }).unwrap();
                    }}
                    disabled={!canUpdate || saving}
                  />
                </div>
                <div className="business-cat-admin-card__actions">
                  <button
                    type="button"
                    className="business-cat-admin-card__edit-btn"
                    onClick={() => openEdit(c)}
                    disabled={!canUpdate}
                  >
                    <Pencil size={16} strokeWidth={2} aria-hidden />
                    Editar nombre
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editing && (
        <FormModal
          open={!!editing}
          onClose={closeEdit}
          title="Editar categoría"
          icon="edit"
          maxWidth="420px"
          onSubmit={handleSaveName}
          submitting={saving}
          submitLabel="Guardar"
          error={submitError}
        >
          <div className="modal-field">
            <label htmlFor="bc-name">Nombre</label>
            <input
              id="bc-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              autoComplete="off"
            />
          </div>
        </FormModal>
      )}
    </div>
  );
}
