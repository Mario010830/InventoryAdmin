"use client";

import { useGetOrderByIdQuery } from "@/app/dashboard/sales/_service/salesApi";
import { useDisplayCurrency } from "@/contexts/DisplayCurrencyContext";
import type { SaleOrderResponse } from "@/lib/dashboard-types";
import { formatDetailDate } from "@/lib/formatDetailDate";
import { DetailField, DetailSection } from "./DetailPrimitives";
import { StatusBadgeInline } from "./StatusBadgeInline";

export function SaleOrderDetailBody({ row }: { row: SaleOrderResponse }) {
  const { formatCup } = useDisplayCurrency();
  const { data: full, isLoading } = useGetOrderByIdQuery(row.id);

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
            label="Total"
            value={<strong>{formatCup(order.total)}</strong>}
          />
        </div>
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
    </>
  );
}
