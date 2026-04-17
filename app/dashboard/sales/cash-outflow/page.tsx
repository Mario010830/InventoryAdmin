"use client";

import { useMemo, useState } from "react";
import { DatePickerSimple } from "@/components/DatePickerSimple";
import { Icon } from "@/components/ui/Icon";
import { useDisplayCurrency } from "@/contexts/DisplayCurrencyContext";
import type { CreateCashOutflowRequest } from "@/lib/dashboard-types";
import {
  extractRtkQueryErrorFields,
  userFacingBusinessErrorMessage,
} from "@/lib/apiBusinessErrors";
import { useAppSelector } from "@/store/store";
import { useGetLocationsQuery } from "../../locations/_service/locationsApi";
import {
  useCreateCashOutflowMutation,
  useDeleteCashOutflowMutation,
  useGetCashOutflowsQuery,
} from "../_service/cashOutflowApi";
import { useUserPermissionCodes } from "@/lib/useUserPermissionCodes";
import { toast } from "sonner";
import "../sales.css";

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function CashOutflowPage() {
  const { formatCup } = useDisplayCurrency();
  const auth = useAppSelector((s) => s.auth);
  const fixedLocationId = auth?.locationId && auth.locationId > 0 ? auth.locationId : 0;

  const { has: hasPermission } = useUserPermissionCodes();
  const canView = hasPermission("daily_summary.view");
  const canManage = hasPermission("daily_summary.create");

  const [dateYmd, setDateYmd] = useState(todayYmd);
  const [locationId, setLocationId] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");

  const authOrgId = auth?.organizationId ?? 0;
  const { data: locResult } = useGetLocationsQuery(
    {
      page: 1,
      perPage: 300,
      sortOrder: "asc",
      ...(authOrgId ? { organizationId: authOrgId } : {}),
    },
    { skip: fixedLocationId > 0 },
  );
  const locations = locResult?.data ?? [];

  const locIdForQuery =
    fixedLocationId > 0
      ? fixedLocationId
      : locationId.trim() === ""
        ? undefined
        : Number(locationId);

  const { data: rows = [], isFetching } = useGetCashOutflowsQuery(
    { date: `${dateYmd}T00:00:00`, locationId: locIdForQuery },
    { skip: !dateYmd || !(canView || canManage) },
  );

  const [createOutflow, { isLoading: creating }] =
    useCreateCashOutflowMutation();
  const [deleteOutflow, { isLoading: deleting }] =
    useDeleteCashOutflowMutation();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const amt = parseFloat(amountStr.trim().replace(",", "."));
    if (!Number.isFinite(amt) || amt < 0.01) {
      setFormError("Indica un importe válido (mínimo 0,01).");
      return;
    }
    if (fixedLocationId <= 0 && (!locationId.trim() || Number(locationId) <= 0)) {
      setFormError("Selecciona la ubicación del retiro.");
      return;
    }
    try {
      const body: CreateCashOutflowRequest = {
        date: `${dateYmd}T00:00:00`,
        amount: amt,
        notes: notes.trim() ? notes.trim().slice(0, 500) : null,
      };
      if (fixedLocationId > 0) {
        body.locationId = fixedLocationId;
      } else {
        body.locationId = Number(locationId);
      }
      await createOutflow(body).unwrap();
      toast.success("Retiro registrado.");
      setAmountStr("");
      setNotes("");
    } catch (err) {
      const { customStatusCode, message } = extractRtkQueryErrorFields(err);
      setFormError(
        userFacingBusinessErrorMessage(customStatusCode, message, "es"),
      );
    }
  };

  const handleDelete = async (id: number) => {
    if (!canManage) return;
    if (!window.confirm("¿Eliminar este retiro de caja?")) return;
    try {
      await deleteOutflow({
        id,
        date: `${dateYmd}T00:00:00`,
        locationId: locIdForQuery,
      }).unwrap();
      toast.success("Retiro eliminado.");
    } catch (err) {
      const { customStatusCode, message } = extractRtkQueryErrorFields(err);
      toast.error(
        userFacingBusinessErrorMessage(customStatusCode, message, "es"),
      );
    }
  };

  const locationLabel = useMemo(() => {
    if (fixedLocationId > 0) {
      return auth?.location?.name ?? `Ubicación #${fixedLocationId}`;
    }
    const n = Number(locationId);
    return locations.find((l) => l.id === n)?.name ?? "—";
  }, [auth?.location?.name, fixedLocationId, locationId, locations]);

  if (!canView && !canManage) {
    return (
      <div className="dashboard-card" style={{ padding: 24 }}>
        <h1 className="dashboard-page-title">Retiro de caja</h1>
        <p style={{ marginTop: 12, color: "#64748b" }}>
          No tienes permisos de cuadre diario para esta sección.
        </p>
      </div>
    );
  }

  return (
    <div className="dashboard-card" style={{ padding: 24, maxWidth: 900 }}>
      <h1 className="dashboard-page-title" style={{ marginBottom: 8 }}>
        Retiro de caja
      </h1>
      <p style={{ marginBottom: 20, color: "#64748b", fontSize: 14 }}>
        Salidas manuales de efectivo por fecha contable y ubicación. No se
        pueden registrar ni eliminar si el cuadre del día está cerrado.
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          alignItems: "flex-end",
          marginBottom: 20,
        }}
      >
        <div>
          <span
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            Fecha contable
          </span>
          <DatePickerSimple
            date={dateYmd}
            setDate={setDateYmd}
            emptyLabel="Elegir"
            triggerId="cash-outflow-date"
          />
        </div>
        {fixedLocationId <= 0 ? (
          <div>
            <label
              htmlFor="cash-outflow-loc"
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              Ubicación
            </label>
            <select
              id="cash-outflow-loc"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              style={{ minWidth: 220, padding: "8px 10px", borderRadius: 8 }}
            >
              <option value="">— Seleccionar —</option>
              {locations.map((l) => (
                <option key={l.id} value={String(l.id)}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div style={{ fontSize: 14 }}>
            <strong>Ubicación:</strong> {locationLabel}
          </div>
        )}
      </div>

      {canManage ? (
        <form
          onSubmit={handleCreate}
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
          }}
        >
          <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>Nuevo retiro</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <div style={{ flex: "1 1 140px" }}>
              <label htmlFor="co-amount" style={{ fontSize: 12 }}>
                Importe *
              </label>
              <input
                id="co-amount"
                type="text"
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0,00"
                style={{
                  width: "100%",
                  marginTop: 4,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                }}
              />
            </div>
            <div style={{ flex: "2 1 240px" }}>
              <label htmlFor="co-notes" style={{ fontSize: 12 }}>
                Notas (opcional, máx. 500)
              </label>
              <input
                id="co-notes"
                type="text"
                value={notes}
                maxLength={500}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: "100%",
                  marginTop: 4,
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                }}
              />
            </div>
            <div style={{ alignSelf: "flex-end" }}>
              <button
                type="submit"
                className="dt-btn-add"
                disabled={creating || deleting}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Icon name="remove_circle_outline" />
                Registrar retiro
              </button>
            </div>
          </div>
          {formError ? (
            <p className="form-error" style={{ marginTop: 10 }}>
              {formError}
            </p>
          ) : null}
        </form>
      ) : null}

      <h2 style={{ fontSize: 16, marginBottom: 10 }}>Retiros del día</h2>
      {isFetching && rows.length === 0 ? (
        <p style={{ color: "#64748b" }}>Cargando…</p>
      ) : rows.length === 0 ? (
        <p style={{ color: "#64748b" }}>No hay retiros para esta fecha.</p>
      ) : (
        <table className="sale-create-lines" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>Importe</th>
              <th>Notas</th>
              <th>Usuario</th>
              <th>Creado</th>
              {canManage ? <th aria-label="Acciones" /> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{formatCup(r.amount)}</td>
                <td>{r.notes?.trim() || "—"}</td>
                <td>#{r.userId}</td>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
                {canManage ? (
                  <td>
                    <button
                      type="button"
                      className="sale-create-lines__remove"
                      title="Eliminar"
                      disabled={deleting}
                      onClick={() => void handleDelete(r.id)}
                    >
                      <Icon name="delete_outline" />
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
