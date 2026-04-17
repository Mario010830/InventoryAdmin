"use client";

import { useEffect, useMemo, useState } from "react";
import { FormModal } from "@/components/FormModal";
import { theme } from "@/components/dashboard";
import type { CreateSaleReturnRequest } from "@/lib/dashboard-types";
import {
  extractRtkQueryErrorFields,
  userFacingBusinessErrorMessage,
} from "@/lib/apiBusinessErrors";
import {
  useCreateSaleReturnMutation,
  useGetOrderByIdQuery,
  useGetSaleReturnsBySaleOrderQuery,
} from "./_service/salesApi";
import { toast } from "sonner";
import "../products/products-modal.css";

function normalizeSaleStatus(s: string): string {
  return (s ?? "").trim().toLowerCase();
}

export interface SaleReturnModalProps {
  open: boolean;
  saleOrderId: number | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SaleReturnModal({
  open,
  saleOrderId,
  onClose,
  onSuccess,
}: SaleReturnModalProps) {
  const oid = saleOrderId ?? 0;
  const { data: order, isLoading: loadingOrder } = useGetOrderByIdQuery(oid, {
    skip: !open || !oid,
  });
  const { data: priorReturns } = useGetSaleReturnsBySaleOrderQuery(
    { saleOrderId: oid, page: 1, perPage: 100 },
    { skip: !open || !oid },
  );
  const [createReturn, { isLoading: isSaving }] = useCreateSaleReturnMutation();
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [qtyByItemId, setQtyByItemId] = useState<Record<number, string>>({});
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!open) return;
    setReason("");
    setNotes("");
    setQtyByItemId({});
    setFormError("");
  }, [open, oid]);

  const returnedByLineId = useMemo(() => {
    const m = new Map<number, number>();
    for (const ret of priorReturns?.data ?? []) {
      for (const it of ret.items ?? []) {
        const k = it.saleOrderItemId;
        m.set(k, (m.get(k) ?? 0) + (it.quantity ?? 0));
      }
    }
    return m;
  }, [priorReturns?.data]);

  const maxReturnable = (itemId: number, soldQty: number) => {
    const already = returnedByLineId.get(itemId) ?? 0;
    return Math.max(0, soldQty - already);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || normalizeSaleStatus(order.status) !== "confirmed") {
      setFormError(
        "Solo se pueden registrar devoluciones sobre ventas confirmadas.",
      );
      return;
    }
    const items: CreateSaleReturnRequest["items"] = [];
    for (const line of order.items ?? []) {
      const raw = (qtyByItemId[line.id] ?? "").trim();
      if (raw === "") continue;
      const q = parseFloat(raw.replace(",", "."));
      if (!Number.isFinite(q) || q <= 0) {
        setFormError(`Cantidad inválida para «${line.productName}».`);
        return;
      }
      const max = maxReturnable(line.id, line.quantity);
      if (q > max + 1e-6) {
        setFormError(
          `«${line.productName}»: máximo devolvible ${max} (vendido ${line.quantity}; ya devuelto ${returnedByLineId.get(line.id) ?? 0}).`,
        );
        return;
      }
      items.push({ saleOrderItemId: line.id, quantity: q });
    }
    if (items.length === 0) {
      setFormError("Indica al menos una línea con cantidad a devolver.");
      return;
    }
    setFormError("");
    try {
      const body: CreateSaleReturnRequest = {
        saleOrderId: order.id,
        items,
        reason: reason.trim() || null,
        notes: notes.trim() || null,
      };
      await createReturn(body).unwrap();
      toast.success("Devolución registrada.");
      onSuccess?.();
      onClose();
    } catch (err) {
      const { customStatusCode, message } = extractRtkQueryErrorFields(err);
      setFormError(
        userFacingBusinessErrorMessage(customStatusCode, message, "es"),
      );
    }
  };

  const confirmed =
    order != null && normalizeSaleStatus(order.status) === "confirmed";

  if (!open) return null;

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={order ? `Devolución · ${order.folio}` : "Nueva devolución"}
      icon="rotate_ccw"
      maxWidth="560px"
      onSubmit={handleSubmit}
      submitting={isSaving}
      submitLabel="Registrar devolución"
      error={formError}
    >
      {loadingOrder || !order ? (
        <p style={{ color: theme.secondaryText }}>Cargando venta…</p>
      ) : !confirmed ? (
        <p>Solo aplica a ventas en estado confirmado.</p>
      ) : (
        <>
          <p
            style={{
              margin: "0 0 12px",
              fontSize: 13,
              color: theme.secondaryText,
            }}
          >
            Indica cantidades a devolver por línea (id de línea en la venta:{" "}
            <code>items[].id</code> del API). La devolución queda registrada como
            completada.
          </p>
          <div className="modal-field field-full">
            <label htmlFor="sr-reason">Motivo (opcional)</label>
            <input
              id="sr-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. Cambio de opinión, defecto…"
            />
          </div>
          <div className="modal-field field-full">
            <label htmlFor="sr-notes">Notas (opcional)</label>
            <textarea
              id="sr-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="modal-field field-full">
            <label>Líneas</label>
            <div className="sale-create-lines-wrap">
              <table className="sale-create-lines">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Vendido</th>
                    <th>Ya devuelto</th>
                    <th>Máx.</th>
                    <th>Cant. a devolver</th>
                  </tr>
                </thead>
                <tbody>
                  {(order.items ?? []).map((line) => {
                    const ret = returnedByLineId.get(line.id) ?? 0;
                    const max = maxReturnable(line.id, line.quantity);
                    return (
                      <tr key={line.id}>
                        <td>
                          <span className="sale-create-lines__name">
                            {line.productName}
                          </span>
                          <span
                            className="sale-create-lines__hint"
                            style={{ display: "block" }}
                          >
                            Línea id {line.id}
                          </span>
                        </td>
                        <td>{line.quantity}</td>
                        <td>{ret}</td>
                        <td>{max}</td>
                        <td>
                          <input
                            type="text"
                            inputMode="decimal"
                            aria-label={`Devolver ${line.productName}`}
                            placeholder="0"
                            value={qtyByItemId[line.id] ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setQtyByItemId((prev) => ({
                                ...prev,
                                [line.id]: v,
                              }));
                            }}
                            style={{
                              width: "100%",
                              padding: "6px 8px",
                              borderRadius: 6,
                              border: `1px solid ${theme.divider}`,
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </FormModal>
  );
}
