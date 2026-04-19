"use client";

import { useState } from "react";
import { SaleReturnModal } from "@/app/dashboard/sales/SaleReturnModal";
import { useGetOrderByIdQuery } from "@/app/dashboard/sales/_service/salesApi";
import { useDisplayCurrency } from "@/contexts/DisplayCurrencyContext";
import { formatAmountWithCode } from "@/lib/displayCurrencyFormat";
import type {
  SaleOrderPaymentDenominationResponse,
  SaleOrderResponse,
} from "@/lib/dashboard-types";
import { formatDetailDate } from "@/lib/formatDetailDate";
import { useUserPermissionCodes } from "@/lib/useUserPermissionCodes";
import { DetailField, DetailSection } from "./DetailPrimitives";
import { StatusBadgeInline } from "./StatusBadgeInline";

function isConfirmedSaleStatus(status: string): boolean {
  return (status ?? "").trim().toLowerCase() === "confirmed";
}

function denomKindLabel(
  d: SaleOrderPaymentDenominationResponse & { Kind?: string },
): string {
  const k = String(d.kind ?? d.Kind ?? "")
    .trim()
    .toLowerCase();
  return k === "change" ? "Vuelto" : "Entregado";
}

export function SaleOrderDetailBody({ row }: { row: SaleOrderResponse }) {
  const { formatCup, priceDecimals } = useDisplayCurrency();
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
                  <li key={p.id ?? `${p.paymentMethodId}-${idx}`}>
                    <div>
                      {p.paymentMethodName ?? `Método #${p.paymentMethodId}`}
                      {p.paymentMethodInstrumentReference
                        ? ` (${p.paymentMethodInstrumentReference})`
                        : ""}
                      : {formatCup(p.amount)}
                      {p.currencyCode != null &&
                      p.currencyCode.trim() !== "" &&
                      p.amountForeign != null &&
                      Number.isFinite(p.amountForeign) ? (
                        <>
                          {" "}
                          · neto{" "}
                          {formatAmountWithCode(
                            p.amountForeign,
                            p.currencyCode,
                            priceDecimals,
                          )}
                        </>
                      ) : null}
                      {p.exchangeRateSnapshot != null &&
                      Number.isFinite(p.exchangeRateSnapshot) ? (
                        <span style={{ color: "#64748b" }}>
                          {" "}
                          (tasa {p.exchangeRateSnapshot})
                        </span>
                      ) : null}
                      {p.reference?.trim()
                        ? ` — ref. op.: ${p.reference}`
                        : null}
                    </div>
                    {p.denominations && p.denominations.length > 0 ? (
                      <ul
                        style={{
                          margin: "6px 0 0 16px",
                          padding: 0,
                          listStyle: "disc",
                          fontSize: 13,
                          color: "#475569",
                        }}
                      >
                        {p.denominations.map((d, di) => (
                          <li key={`${p.id ?? idx}-d-${di}`}>
                            {denomKindLabel(d)}: {d.quantity} × {d.value}
                          </li>
                        ))}
                      </ul>
                    ) : null}
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
