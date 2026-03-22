"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useAppSelector, useAppDispatch } from "@/store/store";
import { removeItem, updateQuantity, clearCart } from "@/store/cartSlice";
import { getApiUrl } from "@/lib/auth-api";
import { getProxiedImageSrc } from "@/lib/proxiedImageSrc";
import type { CreateSaleOrderRequest } from "@/lib/dashboard-types";
import { useDisplayCurrency } from "@/contexts/DisplayCurrencyContext";

interface CustomerInfo {
  name: string;
  phone: string;
  address: string;
  notes: string;
}

function buildWaMessage(
  items: { name: string; quantity: number; unitPrice: number }[],
  locationName: string,
  folio: string,
  customer: CustomerInfo,
  formatCup: (n: number) => string,
): string {
  const lines = items
    .map((i) => `- ${i.name} x ${i.quantity} — ${formatCup(i.unitPrice)} c/u`)
    .join("\n");
  const total = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const parts = [
    `Hola, quiero solicitar el siguiente pedido:`,
    ``,
    lines,
    ``,
    `Total: ${formatCup(total)}`,
    `Ubicación: ${locationName}`,
    `Ref. orden: ${folio}`,
  ];
  if (customer.name) parts.push(`Nombre: ${customer.name}`);
  if (customer.phone) parts.push(`Teléfono: ${customer.phone}`);
  if (customer.address) parts.push(`Dirección de entrega: ${customer.address}`);
  if (customer.notes) parts.push(`Notas: ${customer.notes}`);
  return parts.join("\n");
}

/* ─── Confirm Order Modal ─── */

interface ConfirmProps {
  onClose: () => void;
  onConfirm: (c: CustomerInfo) => Promise<void>;
  submitting: boolean;
  error: string;
}

function ConfirmOrderModal({ onClose, onConfirm, submitting, error }: ConfirmProps) {
  const { formatCup } = useDisplayCurrency();
  const cart = useAppSelector((s) => s.cart);
  const total = cart.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  const [cust, setCust] = useState<CustomerInfo>({
    name: "", phone: "", address: "", notes: "",
  });
  const [errs, setErrs] = useState<Partial<CustomerInfo>>({});

  const upd = (f: keyof CustomerInfo) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setCust((p) => ({ ...p, [f]: e.target.value }));

  const validate = () => {
    const e: Partial<CustomerInfo> = {};
    if (!cust.name.trim()) e.name = "Requerido";
    if (!cust.address.trim()) e.address = "Requerido";
    setErrs(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div className="confirm-overlay" onClick={onClose}>
      <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-modal__head">
          <span className="confirm-modal__icon">
            <Icon name="receipt_long" />
          </span>
          <h2 className="confirm-modal__title">Confirmar pedido</h2>
          <button type="button" className="confirm-modal__x" onClick={onClose} aria-label="Cerrar">
            <Icon name="close" />
          </button>
        </div>

        <div className="confirm-modal__body">
          <div className="confirm-loc">
            <Icon name="location_on" />
            {cart.locationName}
          </div>

          <table className="confirm-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th className="td-right">Cant.</th>
                <th className="td-right">P.U.</th>
                <th className="td-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {cart.items.map((it) => (
                <tr key={it.productId}>
                  <td>{it.name}</td>
                  <td className="td-right">{it.quantity}</td>
                  <td className="td-right">{formatCup(it.unitPrice)}</td>
                  <td className="td-right">{formatCup(it.quantity * it.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="confirm-total">
            <span>Total estimado</span>
            <strong>{formatCup(total)}</strong>
          </div>

          <div className="confirm-section">
            <Icon name="person" />
            Datos de contacto
          </div>

          <div className="confirm-fields">
            <div className="confirm-field">
              <label>Nombre *</label>
              <input value={cust.name} onChange={upd("name")} placeholder="Tu nombre" disabled={submitting} />
              {errs.name && <span className="confirm-field-err">{errs.name}</span>}
            </div>
            <div className="confirm-field">
              <label>Teléfono</label>
              <input type="tel" value={cust.phone} onChange={upd("phone")} placeholder="Número" disabled={submitting} />
            </div>
            <div className="confirm-field confirm-field--full">
              <label>Dirección *</label>
              <input value={cust.address} onChange={upd("address")} placeholder="Calle, número, colonia…" disabled={submitting} />
              {errs.address && <span className="confirm-field-err">{errs.address}</span>}
            </div>
            <div className="confirm-field confirm-field--full">
              <label>Notas</label>
              <textarea value={cust.notes} onChange={upd("notes")} placeholder="Indicaciones especiales" rows={2} disabled={submitting} />
            </div>
          </div>

          {error && <p className="confirm-error">{error}</p>}
        </div>

        <div className="confirm-modal__foot">
          <button type="button" className="confirm-btn confirm-btn--back" onClick={onClose} disabled={submitting}>
            Volver
          </button>
          <button
            type="button"
            className="confirm-btn confirm-btn--send"
            onClick={() => validate() && onConfirm(cust)}
            disabled={submitting}
          >
            <Icon name={submitting ? "hourglass_empty" : "chat"} />
            {submitting ? "Registrando…" : "Confirmar y enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Cart Drawer ─── */

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const { formatCup } = useDisplayCurrency();
  const dispatch = useAppDispatch();
  const cart = useAppSelector((s) => s.cart);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [waWarningOpen, setWaWarningOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState("");

  const count = cart.items.reduce((s, i) => s + i.quantity, 0);
  const total = cart.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  const handleConfirm = async (customer: CustomerInfo) => {
    if (!cart.locationId) return;
    setSubmitting(true);
    setSubmitErr("");

    try {
      const note = [
        customer.name ? `Nombre: ${customer.name}` : "",
        customer.phone ? `Teléfono: ${customer.phone}` : "",
        customer.address ? `Dirección: ${customer.address}` : "",
        customer.notes ? `Notas: ${customer.notes}` : "",
      ].filter(Boolean).join(" | ");

      const body: CreateSaleOrderRequest = {
        locationId: cart.locationId,
        contactId: null,
        notes: note || null,
        discountAmount: 0,
        items: cart.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: 0,
        })),
      };

      const res = await fetch(`${getApiUrl()}/sale-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`Error ${res.status}`);

      const data = (await res.json()) as { result?: { folio?: string; id?: number } };
      const order = data.result ?? {};
      const folio = order.folio ?? (order.id ? `#${order.id}` : "nueva");

      if (cart.whatsAppContact) {
        const msg = buildWaMessage(cart.items, cart.locationName, folio, customer, formatCup);
        window.open(
          `https://wa.me/${cart.whatsAppContact}?text=${encodeURIComponent(msg)}`,
          "_blank",
          "noopener,noreferrer"
        );
      }

      dispatch(clearCart());
      setConfirmOpen(false);
      onOpenChange(false);
    } catch {
      setSubmitErr("No se pudo registrar la orden. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* FAB for mobile */}
      <button
        type="button"
        className="cart-fab"
        onClick={() => onOpenChange(true)}
        aria-label={`Carrito (${count})`}
      >
        <Icon name="shopping_cart" />
        {count > 0 && (
          <span className="cart-fab__badge">{count > 99 ? "99+" : count}</span>
        )}
      </button>

      {/* Slide-over panel */}
      {open && (
        <>
          <div className="cart-overlay" onClick={() => onOpenChange(false)} aria-hidden />

          <aside className="cart-panel" role="dialog" aria-label="Tu pedido">
            <div className="cart-panel__head">
              <span className="cart-panel__title">
                <Icon name="shopping_cart" />
                Tu pedido {count > 0 && `(${count})`}
              </span>
              {cart.items.length > 0 && (
                <button type="button" className="cart-panel__clear" onClick={() => dispatch(clearCart())}>
                  Vaciar
                </button>
              )}
              <button type="button" className="cart-panel__x" onClick={() => onOpenChange(false)} aria-label="Cerrar">
                <Icon name="close" />
              </button>
            </div>

            <div className="cart-panel__list">
              {cart.items.length === 0 ? (
                <div className="cart-panel__empty">
                  <Icon name="remove_shopping_cart" />
                  <p>Tu carrito está vacío</p>
                </div>
              ) : (
                cart.items.map((it) => (
                  <div key={it.productId} className="cart-row">
                    {it.imagenUrl ? (
                      <img src={getProxiedImageSrc(it.imagenUrl) ?? it.imagenUrl} alt={it.name} className="cart-row__img" />
                    ) : (
                      <div className="cart-row__no-img">
                        <Icon name="inventory_2" />
                      </div>
                    )}

                    <div className="cart-row__body">
                      <div className="cart-row__name">{it.name}</div>
                      <div className="cart-row__unit">{formatCup(it.unitPrice)} c/u</div>
                      <div className="cart-row__stepper">
                        <button
                          type="button"
                          className="cart-row__step-btn"
                          onClick={() => dispatch(updateQuantity({ productId: it.productId, quantity: it.quantity - 1 }))}
                        >
                          −
                        </button>
                        <span className="cart-row__step-val">{it.quantity}</span>
                        <button
                          type="button"
                          className="cart-row__step-btn"
                          disabled={it.tipo !== "elaborado" && it.quantity >= it.stockAtLocation}
                          onClick={() => dispatch(updateQuantity({ productId: it.productId, quantity: it.quantity + 1 }))}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <span className="cart-row__subtotal">{formatCup(it.quantity * it.unitPrice)}</span>

                    <button
                      type="button"
                      className="cart-row__del"
                      onClick={() => dispatch(removeItem(it.productId))}
                      aria-label={`Quitar ${it.name}`}
                    >
                      <Icon name="delete_outline" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {cart.items.length > 0 && (
              <div className="cart-panel__foot">
                <div className="cart-panel__total">
                  <span className="cart-panel__total-label">Total estimado</span>
                  <span className="cart-panel__total-value">{formatCup(total)}</span>
                </div>

                {cart.whatsAppContact ? (
                  <button
                    type="button"
                    className="cart-panel__wa"
                    onClick={() => {
                      setSubmitErr("");
                      if (cart.isOpenNow === false) {
                        setWaWarningOpen(true);
                      } else {
                        setConfirmOpen(true);
                      }
                    }}
                  >
                    <Icon name="chat" />
                    Enviar pedido por WhatsApp
                  </button>
                ) : (
                  <div className="cart-panel__wa-off">
                    Esta ubicación no tiene WhatsApp configurado.
                  </div>
                )}
              </div>
            )}
          </aside>
        </>
      )}

      {confirmOpen && (
        <ConfirmOrderModal
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleConfirm}
          submitting={submitting}
          error={submitErr}
        />
      )}

      {waWarningOpen && (
        <div className="confirm-overlay" onClick={() => setWaWarningOpen(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal__head">
              <span className="confirm-modal__icon" style={{ background: "var(--st-orange-soft)", color: "var(--st-orange)" }}>
                <Icon name="warning_amber" />
              </span>
              <h2 className="confirm-modal__title">La tienda puede estar cerrada</h2>
              <button
                type="button"
                className="confirm-modal__x"
                onClick={() => setWaWarningOpen(false)}
                aria-label="Cerrar"
              >
                <Icon name="close" />
              </button>
            </div>
            <div className="confirm-modal__body">
              <p className="store-empty__text" style={{ margin: 0 }}>
                Esta tienda puede estar cerrada ahora.
              </p>
              {(cart.todayOpen || cart.todayClose) && (
                <p className="store-empty__text" style={{ marginTop: 8 }}>
                  Horario de hoy: {cart.todayOpen ?? "—"} - {cart.todayClose ?? "—"}
                </p>
              )}
            </div>
            <div className="confirm-modal__foot">
              <button
                type="button"
                className="confirm-btn confirm-btn--back"
                onClick={() => setWaWarningOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="confirm-btn confirm-btn--send"
                onClick={() => {
                  setWaWarningOpen(false);
                  setConfirmOpen(true);
                }}
              >
                Enviar igual
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
