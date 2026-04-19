"use client";

import { useEffect, useState } from "react";
import { FormModal } from "@/components/FormModal";
import Switch from "@/components/Switch";
import type {
  CurrencyDenominationResponse,
  CurrencyResponse,
} from "@/lib/dashboard-types";
import { useUserPermissionCodes } from "@/lib/useUserPermissionCodes";
import {
  useCreateDenominationMutation,
  useDeleteDenominationMutation,
  useGetDenominationsQuery,
  useUpdateDenominationMutation,
} from "./_service/currencyApi";

export interface CurrencyDenominationsModalProps {
  open: boolean;
  currency: CurrencyResponse | null;
  onClose: () => void;
}

export function CurrencyDenominationsModal({
  open,
  currency,
  onClose,
}: CurrencyDenominationsModalProps) {
  const { has } = useUserPermissionCodes();
  const canCreate = has("currency.create");
  const canUpdate = has("currency.update");
  const canDelete = has("currency.delete");

  const cid = currency?.id ?? 0;
  const { data: rows = [], isFetching, refetch } = useGetDenominationsQuery(
    { currencyId: cid, activeOnly: false },
    { skip: !open || !cid },
  );

  const [createDenom, { isLoading: creating }] =
    useCreateDenominationMutation();
  const [updateDenom, { isLoading: updating }] =
    useUpdateDenominationMutation();
  const [deleteDenom, { isLoading: deleting }] =
    useDeleteDenominationMutation();

  const [valueStr, setValueStr] = useState("");
  const [sortOrderStr, setSortOrderStr] = useState("0");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!open) return;
    setValueStr("");
    setSortOrderStr("0");
    setFormError("");
  }, [open, cid]);

  const busy = creating || updating || deleting;

  const handleAdd = async () => {
    if (!currency || !cid || !canCreate) return;
    const value = parseFloat(valueStr.replace(",", "."));
    const sortOrder = parseInt(sortOrderStr, 10);
    if (!Number.isFinite(value) || value <= 0) {
      setFormError("El valor facial debe ser mayor que cero.");
      return;
    }
    setFormError("");
    try {
      await createDenom({
        currencyId: cid,
        body: {
          value,
          sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
        },
      }).unwrap();
      setValueStr("");
      setSortOrderStr("0");
      void refetch();
    } catch (e) {
      const msg =
        e && typeof e === "object" && "data" in e
          ? String((e as { data?: { message?: string } }).data?.message ?? "")
          : "";
      setFormError(msg || "No se pudo crear la denominación.");
    }
  };

  const toggleActive = async (
    row: CurrencyDenominationResponse,
    isActive: boolean,
  ) => {
    if (!cid || !canUpdate) return;
    try {
      await updateDenom({
        currencyId: cid,
        id: row.id,
        body: { isActive },
      }).unwrap();
      void refetch();
    } catch {
      /* silencioso */
    }
  };

  const removeRow = async (row: CurrencyDenominationResponse) => {
    if (!cid || !canDelete) return;
    if (!window.confirm(`¿Eliminar denominación ${row.value}?`)) return;
    try {
      await deleteDenom({ currencyId: cid, id: row.id }).unwrap();
      void refetch();
    } catch {
      /* */
    }
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={currency ? `Denominaciones — ${currency.code}` : "Denominaciones"}
      icon="payments"
      maxWidth="560px"
      onSubmit={(e) => {
        e.preventDefault();
        if (canCreate) void handleAdd();
      }}
      submitting={busy}
      submitLabel="Añadir denominación"
      cancelLabel="Cerrar"
      error={formError}
      showSubmitButton={canCreate}
    >
      {!currency ? (
        <p>Selecciona una moneda.</p>
      ) : (
        <>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "#64748b" }}>
            Catálogo de billetes y monedas para la calculadora de cobro. El API
            ordena por sortOrder ascendente y luego valor descendente.
          </p>

          {isFetching ? (
            <p style={{ color: "#64748b" }}>Cargando…</p>
          ) : (
            <div style={{ overflowX: "auto", marginBottom: 16 }}>
              <table className="settings-table">
                <thead>
                  <tr>
                    <th>Valor</th>
                    <th>Orden</th>
                    <th>Activa</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.value}</td>
                      <td>{r.sortOrder}</td>
                      <td>
                        <Switch
                          checked={r.isActive}
                          disabled={!canUpdate || busy}
                          onChange={(checked) => void toggleActive(r, checked)}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="settings-btn settings-btn--danger-ghost"
                          disabled={!canDelete || busy}
                          onClick={() => void removeRow(r)}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length === 0 ? (
                <p style={{ fontSize: 13, color: "#64748b", marginTop: 8 }}>
                  No hay denominaciones. Añade la primera con el formulario
                  inferior.
                </p>
              ) : null}
            </div>
          )}

          {canCreate ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                alignItems: "end",
              }}
            >
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 13 }}>Valor facial</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={valueStr}
                  onChange={(e) => setValueStr(e.target.value)}
                  placeholder="ej. 100"
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 13 }}>sortOrder</span>
                <input
                  type="number"
                  value={sortOrderStr}
                  onChange={(e) => setSortOrderStr(e.target.value)}
                />
              </label>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "#64748b" }}>
              No tienes permiso para crear denominaciones (currency.create).
            </p>
          )}
        </>
      )}
    </FormModal>
  );
}
