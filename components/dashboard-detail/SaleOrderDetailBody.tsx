"use client";

import { useState } from "react";
import { SaleReturnModal } from "@/app/dashboard/sales/SaleReturnModal";
import { useGetOrderByIdQuery } from "@/app/dashboard/sales/_service/salesApi";
import { useDisplayCurrency } from "@/contexts/DisplayCurrencyContext";
import type { SaleOrderResponse } from "@/lib/dashboard-types";
import { formatDetailDate } from "@/lib/formatDetailDate";
import { useUserPermissionCodes } from "@/lib/useUserPermissionCodes";
import { DetailField, DetailSection } from "./DetailPrimitives";
import { StatusBadgeInline } from "./StatusBadgeInline";

function isConfirmedSaleStatus(status: string): boolean {
  return (status ?? "").trim().toLowerCase() === "confirmed";
}

export function SaleOrderDetailBody({ row }: { row: SaleOrderResponse }) {
  const { formatCup } = useDisplayCurrency();
  const { data: full, isLoading, refetch } = useGetOrderByIdQuery(row.id);
  const [returnOpen, setReturnOpen] = useState(false);
  const { has } = useUserPermissionCodes();
  const canCreateReturn = has("sale.return.create");

  const order = full ?? row;
  const items = order.items?.length ? order.items : (row.items ?? []);

  if (isLoading && !full) {
    return (
      <p className="gd-detail-field__value" style={{ color: "#64748b" }}>
        Cargando detalle…
      </p>
    );
  }

  const sellerLabel =
    order.userId != null && order.userId > 0 ? `Usuario #${order.userId}` : "—";

  return (
    <>
      <DetailSection title="General">
        <div className="gd-detail-section__grid gd-detail-section__grid--two">
          <DetailField label="Referencia" value={order.folio ?? "—"} />
          <DetailField
            label="Cliente"
            value={order.contactName?.trim() ? order.contactName : "—"}
          />
          <DetailField
            label="Estado"
            value={<StatusBadgeInline status={order.status} />}
          />
        </div>
      </DetailSection>
      <DetailSection title="Detalle">
        <DetailField
          label="Productos vendidos"
          value={
            items.length === 0 ? (
              "—"
            ) : (
              <ul className="gd-detail-list">
                {items.map((it) => (
                  <li key={it.id}>
                    {it.productName} × {it.quantity} — {formatCup(it.lineTotal)}
                  </li>
                ))}
              </ul>
            )
          }
        />
        <div className="gd-detail-section__grid gd-detail-section__grid--two">
          <DetailField label="Subtotal" value={formatCup(order.subtotal)} />
          <DetailField
            label="Descuento"
            value={formatCup(order.discountAmount ?? 0)}
          />
          <DetailField
            label="Total"
            value={<strong>{formatCup(order.total)}</strong>}
          />
        </div>
        {order.payments && order.payments.length > 0 ? (
          <DetailField
            label="Pagos"
            value={
              <ul className="gd-detail-list">
                {order.payments.map((p, idx) => (
                  <li key={`${p.paymentMethodId}-${idx}`}>
                    {p.paymentMethodName ?? `Método #${p.paymentMethodId}`}
                    {p.paymentMethodInstrumentReference
                      ? ` (${p.paymentMethodInstrumentReference})`
                      : ""}
                    : {formatCup(p.amount)}
                    {p.reference?.trim() ? ` — ref. op.: ${p.reference}` : ""}
                  </li>
                ))}
              </ul>
            }
          />
        ) : null}
      </DetailSection>
      <DetailSection title="Fechas">
        <div className="gd-detail-section__grid gd-detail-section__grid--two">
          <DetailField
            label="Fecha de venta"
            value={formatDetailDate(order.createdAt)}
          />
          <DetailField label="Creado por" value={sellerLabel} />
        </div>
      </DetailSection>
      {canCreateReturn && isConfirmedSaleStatus(order.status) ? (
        <>
          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              className="dt-btn-add"
              onClick={() => setReturnOpen(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              Registrar devolución
            </button>
          </div>
          <SaleReturnModal
            open={returnOpen}
            saleOrderId={returnOpen ? order.id : null}
            onClose={() => setReturnOpen(false)}
            onSuccess={() => void refetch()}
          />
        </>
      ) : null}
    </>
  );
}
