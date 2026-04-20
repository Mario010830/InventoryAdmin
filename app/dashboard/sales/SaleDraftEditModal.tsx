"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FormModal } from "@/components/FormModal";
import { theme } from "@/components/dashboard";
import { useGetPaymentMethodsByLocationQuery } from "@/app/catalog/_service/catalogApi";
import { useGetContactsQuery } from "@/app/dashboard/contacts/_service/contactsApi";
import type { SaleOrderResponse } from "@/lib/dashboard-types";
import {
  extractRtkQueryErrorFields,
  userFacingBusinessErrorMessage,
} from "@/lib/apiBusinessErrors";
import { useDisplayCurrency } from "@/contexts/DisplayCurrencyContext";
import { useGetCurrenciesQuery } from "@/app/dashboard/settings/_service/currencyApi";
import { SalePaymentLinesForm } from "./SalePaymentLinesForm";
import {
  amountsMatchTotal,
  buildPaymentsFromDraft,
  parseMoney,
  paymentLineDraftFromApiPayment,
  paymentsAmountSum,
  round2,
  type PaymentLineDraft,
} from "./salePaymentUtils";
import {
  useGetOrderByIdQuery,
  useUpdateOrderMutation,
} from "./_service/salesApi";
import "../products/products-modal.css";

export interface SaleDraftEditModalProps {
  open: boolean;
  orderId: number | null;
  onClose: () => void;
  onSuccess?: () => void;
}

function paymentLinesFromOrder(order: SaleOrderResponse): PaymentLineDraft[] {
  if (!order.payments?.length) return [];
  return order.payments.map((p) => paymentLineDraftFromApiPayment(p));
}

export function SaleDraftEditModal({
  open,
  orderId,
  onClose,
  onSuccess,
}: SaleDraftEditModalProps) {
  const { formatCup, priceDecimals } = useDisplayCurrency();
  const { data: currencyList = [] } = useGetCurrenciesQuery(undefined, {
    skip: !open,
  });
  const oid = orderId ?? 0;
  const { data: order, isLoading } = useGetOrderByIdQuery(oid, {
    skip: !open || !oid,
  });

  const { data: contactsResult } = useGetContactsQuery(
    { page: 1, perPage: 300, sortOrder: "asc", role: "customer" },
    { skip: !open },
  );
  const contacts = contactsResult?.data ?? [];

  const locId = order?.locationId ?? 0;
  const { data: paymentMethods = [] } = useGetPaymentMethodsByLocationQuery(
    locId,
    { skip: !open || !locId },
  );

  const [contactId, setContactId] = useState("");
  const [notes, setNotes] = useState("");
  const [discountStr, setDiscountStr] = useState("");
  const [paymentLines, setPaymentLines] = useState<PaymentLineDraft[]>([]);
  const [formError, setFormError] = useState("");
  const [updateOrder, { isLoading: isSaving }] = useUpdateOrderMutation();

  useEffect(() => {
    if (!open || !order) return;
    setContactId(order.contactId != null ? String(order.contactId) : "");
    setNotes(order.notes ?? "");
    setDiscountStr(
      order.discountAmount != null && order.discountAmount > 0
        ? String(order.discountAmount)
        : "",
    );
    setPaymentLines(paymentLinesFromOrder(order));
    setFormError("");
  }, [open, order?.id, order?.modifiedAt]);

  const discountNum = useMemo(() => {
    const t = discountStr.trim();
    if (t === "") return 0;
    const n = parseMoney(discountStr);
    return Number.isFinite(n) && n >= 0 ? n : NaN;
  }, [discountStr]);

  const expectedTotal = useMemo(() => {
    if (!order) return 0;
    const d = Number.isFinite(discountNum) && discountNum >= 0 ? discountNum : 0;
    return round2(Math.max(0, order.subtotal - d));
  }, [order, discountNum]);

  const mapSubmitError = useCallback((err: unknown) => {
    const { customStatusCode, message } = extractRtkQueryErrorFields(err);
    return userFacingBusinessErrorMessage(customStatusCode, message, "es");
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order || !oid) return;
    if (discountStr.trim() !== "" && !Number.isFinite(discountNum)) {
      setFormError("Descuento inválido.");
      return;
    }
    const built = buildPaymentsFromDraft(paymentLines, {
      priceDecimals,
      currencies: currencyList,
    });
    if (!built.ok) {
      setFormError(built.error);
      return;
    }
    if (built.payments.length > 0) {
      const sum = paymentsAmountSum(built.payments);
      if (!amountsMatchTotal(sum, expectedTotal)) {
        setFormError(
          `La suma de pagos (${sum.toFixed(2)}) debe coincidir con el total (${expectedTotal.toFixed(2)}).`,
        );
        return;
      }
    }
    setFormError("");
    try {
      const disc = discountStr.trim() === "" ? 0 : discountNum;
      await updateOrder({
        id: oid,
        body: {
          contactId: contactId.trim() === "" ? null : Number(contactId),
          notes: notes.trim() || null,
          discountAmount: disc,
          payments: built.payments,
        },
      }).unwrap();
      onSuccess?.();
      onClose();
    } catch (err) {
      setFormError(mapSubmitError(err));
    }
  };

  if (!open) return null;

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={order ? `Editar borrador ${order.folio}` : "Editar borrador"}
      icon="edit"
      maxWidth="640px"
      onSubmit={handleSave}
      submitting={isSaving || (isLoading && !order)}
      submitLabel="Guardar cambios"
      cancelLabel="Cerrar"
      error={formError}
    >
      {isLoading && !order ? (
        <p style={{ color: theme.secondaryText }}>Cargando orden…</p>
      ) : !order ? (
        <p>No se pudo cargar la orden.</p>
      ) : (
        <>
          <p
            style={{
              margin: "0 0 12px",
              fontSize: 13,
              color: theme.secondaryText,
            }}
          >
            {order.locationName} · Total actual API: {formatCup(order.total)} ·
            Subtotal: {formatCup(order.subtotal)}
          </p>

          <div className="modal-field field-full">
            <label htmlFor="draft-contact">Cliente (opcional)</label>
            <select
              id="draft-contact"
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
            >
              <option value="">— Sin cliente —</option>
              {contacts.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="modal-field field-full">
            <label htmlFor="draft-notes">Notas</label>
            <textarea
              id="draft-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="modal-field">
            <label htmlFor="draft-discount">Descuento global</label>
            <input
              id="draft-discount"
              type="text"
              inputMode="decimal"
              value={discountStr}
              onChange={(e) => setDiscountStr(e.target.value)}
            />
          </div>

          <p
            style={{
              margin: "0 0 8px",
              fontSize: 12,
              color: theme.secondaryText,
            }}
          >
            Tras cambiar el descuento, el total objetivo pasa a ser{" "}
            <strong>{expectedTotal.toFixed(2)}</strong> (subtotal − descuento).
            Ajusta los pagos antes de confirmar la venta.
          </p>

          <SalePaymentLinesForm
            methods={paymentMethods}
            lines={paymentLines}
            onChange={setPaymentLines}
            expectedTotal={expectedTotal}
            disabled={isSaving}
            currencies={currencyList}
          />

          <div className="modal-field field-full">
            <label>Productos (solo lectura)</label>
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                fontSize: 13,
                color: theme.secondaryText,
              }}
            >
              {order.items?.map((it) => (
                <li key={it.id}>
                  {it.productName} × {it.quantity} — {formatCup(it.lineTotal)}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </FormModal>
  );
}
