"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormModal } from "@/components/FormModal";
import { theme } from "@/components/dashboard";
import { Icon } from "@/components/ui/Icon";
import type {
  CreateSaleOrderItem,
  CreateSaleOrderPaymentRequest,
  CreateSaleOrderRequest,
  ProductResponse,
} from "@/lib/dashboard-types";
import {
  extractRtkQueryErrorFields,
  userFacingBusinessErrorMessage,
} from "@/lib/apiBusinessErrors";
import { useAppSelector } from "@/store/store";
import { useDisplayCurrency } from "@/contexts/DisplayCurrencyContext";
import { useGetPaymentMethodsByLocationQuery } from "@/app/catalog/_service/catalogApi";
import { useGetCurrenciesQuery } from "@/app/dashboard/settings/_service/currencyApi";
import { useGetContactsQuery } from "@/app/dashboard/contacts/_service/contactsApi";
import { useGetLocationsQuery } from "@/app/dashboard/locations/_service/locationsApi";
import { useGetProductsQuery } from "@/app/dashboard/products/_service/productsApi";
import { useDefaultLocation } from "@/lib/useDefaultLocation";
import {
  useConfirmOrderMutation,
  useCreateOrderMutation,
} from "./_service/salesApi";
import { SalePaymentLinesForm } from "./SalePaymentLinesForm";
import {
  amountsMatchTotal,
  buildPaymentsFromDraft,
  estimateOrderTotalFromLines,
  paymentsAmountSum,
} from "./salePaymentUtils";
import type { PaymentLineDraft } from "./salePaymentUtils";
import { toast } from "sonner";
import "../products/products-modal.css";
import "./sales.css";

export interface SaleCreateModalProps {
  open: boolean;
  onClose: () => void;
  /** Tras crear (borrador o confirmada) correctamente. */
  onSuccess?: () => void;
}

type SaleLine = {
  key: string;
  productId: number;
  label: string;
  catalogPrice: number;
  quantityStr: string;
  unitPriceStr: string;
};

function parseQty(s: string): number {
  const n = parseFloat(s.trim().replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

function buildItemsFromLines(lines: SaleLine[]): CreateSaleOrderItem[] {
  return lines.map((line) => {
    const qty = parseQty(line.quantityStr);
    const upRaw = line.unitPriceStr.trim().replace(",", ".");
    const up = upRaw === "" ? null : parseFloat(upRaw);
    const item: CreateSaleOrderItem = {
      productId: line.productId,
      quantity: qty,
      discount: 0,
    };
    if (up != null && Number.isFinite(up) && up >= 0) {
      item.unitPrice = up;
    }
    return item;
  });
}

export function SaleCreateModal({
  open,
  onClose,
  onSuccess,
}: SaleCreateModalProps) {
  const authOrgId = useAppSelector((s) => s.auth?.organizationId) ?? 0;
  const { priceDecimals, formatCup } = useDisplayCurrency();
  const { data: currencyList = [] } = useGetCurrenciesQuery(undefined, {
    skip: !open,
  });

  const { data: locationsResult } = useGetLocationsQuery(
    {
      page: 1,
      perPage: 300,
      sortOrder: "asc",
      ...(authOrgId ? { organizationId: authOrgId } : {}),
    },
    { skip: !open },
  );

  const { data: productsResult } = useGetProductsQuery(
    { page: 1, perPage: 500 },
    { skip: !open },
  );

  const { data: contactsResult } = useGetContactsQuery(
    { page: 1, perPage: 300, sortOrder: "asc" },
    { skip: !open },
  );

  const locations = locationsResult?.data ?? [];
  const products = productsResult?.data ?? [];
  const contacts = contactsResult?.data ?? [];
  const defaultLoc = useDefaultLocation(locations);

  const [locationId, setLocationId] = useState("");
  const [contactId, setContactId] = useState("");
  const [notes, setNotes] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [lines, setLines] = useState<SaleLine[]>([]);
  const [paymentLines, setPaymentLines] = useState<PaymentLineDraft[]>([]);

  const locationIdNum = Number(locationId);
  const { data: paymentMethods = [] } = useGetPaymentMethodsByLocationQuery(
    Number.isFinite(locationIdNum) && locationIdNum > 0 ? locationIdNum : 0,
    {
      skip:
        !open ||
        !Number.isFinite(locationIdNum) ||
        locationIdNum <= 0,
    },
  );

  const estimatedOrderTotal = useMemo(
    () => estimateOrderTotalFromLines(lines, discountAmount),
    [lines, discountAmount],
  );

  const [pickSearch, setPickSearch] = useState("");
  const [pickOpen, setPickOpen] = useState(false);
  const pickRef = useRef<HTMLDivElement>(null);
  const [pickQty, setPickQty] = useState("1");

  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [createOrder] = useCreateOrderMutation();
  const [confirmOrder] = useConfirmOrderMutation();

  useEffect(() => {
    if (!open) return;
    setContactId("");
    setNotes("");
    setDiscountAmount("");
    setLines([]);
    setPaymentLines([]);
    setPickSearch("");
    setPickOpen(false);
    setPickQty("1");
    setFormError("");
    const loc = defaultLoc.locationId;
    setLocationId(loc != null ? String(loc) : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir; defaultLoc puede llegar después
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setPaymentLines([]);
  }, [open, locationId]);

  useEffect(() => {
    if (!open) return;
    if (locationId !== "") return;
    const loc = defaultLoc.locationId;
    if (loc != null) setLocationId(String(loc));
  }, [open, defaultLoc.locationId, locationId]);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!pickRef.current?.contains(e.target as Node)) setPickOpen(false);
    }
    if (!open || !pickOpen) return;
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open, pickOpen]);

  const filteredPickProducts = useMemo(() => {
    const q = pickSearch.trim().toLowerCase();
    if (!q) return products.slice(0, 80);
    return products.filter(
      (p) =>
        String(p.code ?? "")
          .toLowerCase()
          .includes(q) ||
        String(p.name ?? "")
          .toLowerCase()
          .includes(q),
    );
  }, [products, pickSearch]);

  const addProductLine = useCallback(
    (p: ProductResponse) => {
      const qtyAdd = parseQty(pickQty);
      if (!Number.isFinite(qtyAdd) || qtyAdd <= 0) {
        setFormError("Indica una cantidad mayor que cero.");
        return;
      }
      setFormError("");
      const label = `${p.code} — ${p.name}`;
      setLines((prev) => {
        const idx = prev.findIndex((l) => l.productId === p.id);
        if (idx >= 0) {
          const next = [...prev];
          const cur = parseQty(next[idx].quantityStr);
          const sum = (Number.isFinite(cur) ? cur : 0) + qtyAdd;
          next[idx] = { ...next[idx], quantityStr: String(sum) };
          return next;
        }
        return [
          ...prev,
          {
            key: `${p.id}-${Date.now()}`,
            productId: p.id,
            label,
            catalogPrice: p.precio,
            quantityStr: String(qtyAdd),
            unitPriceStr: "",
          },
        ];
      });
      setPickSearch("");
      setPickOpen(false);
      setPickQty("1");
    },
    [pickQty],
  );

  const validateForApi = useCallback((): string | null => {
    if (!locationId.trim())
      return "Elige la tienda en la que se registra la venta.";
    const lid = Number(locationId);
    if (!Number.isFinite(lid) || lid <= 0)
      return "La ubicación seleccionada no es válida.";
    if (contactId.trim() !== "") {
      const cid = Number(contactId);
      if (!Number.isFinite(cid) || cid <= 0) return "Cliente no válido.";
    }
    if (lines.length === 0) return "Añade al menos un producto.";
    for (const line of lines) {
      const q = parseQty(line.quantityStr);
      if (!Number.isFinite(q) || q <= 0)
        return `Revisa la cantidad de «${line.label}».`;
    }
    return null;
  }, [contactId, locationId, lines]);

  const buildRequest = useCallback(
    (payments?: CreateSaleOrderPaymentRequest[]) => {
      const disc = parseFloat(discountAmount.trim().replace(",", "."));
      const req: CreateSaleOrderRequest = {
        locationId: Number(locationId),
        contactId: contactId.trim() === "" ? null : Number(contactId),
        notes: notes.trim() || null,
        discountAmount: Number.isFinite(disc) && disc > 0 ? disc : 0,
        items: buildItemsFromLines(lines),
      };
      if (payments && payments.length > 0) req.payments = payments;
      return req;
    },
    [contactId, discountAmount, lines, locationId, notes],
  );

  const mapSubmitError = useCallback((err: unknown) => {
    const { customStatusCode, message } = extractRtkQueryErrorFields(err);
    return userFacingBusinessErrorMessage(customStatusCode, message, "es");
  }, []);

  const payCtx = useMemo(
    () => ({ priceDecimals, currencies: currencyList }),
    [priceDecimals, currencyList],
  );

  const validatePaymentsOptional = (): string | null => {
    const built = buildPaymentsFromDraft(paymentLines, payCtx);
    if (!built.ok) return built.error;
    if (built.payments.length === 0) return null;
    const sum = paymentsAmountSum(built.payments);
    if (!amountsMatchTotal(sum, estimatedOrderTotal)) {
      return `Si añades cobros, la suma en CUP (${sum.toFixed(2)}) debe igualar el total (${estimatedOrderTotal.toFixed(2)}).`;
    }
    return null;
  };

  const validatePaymentsRequiredForConfirm = (): string | null => {
    const built = buildPaymentsFromDraft(paymentLines, payCtx);
    if (!built.ok) return built.error;
    if (built.payments.length === 0) {
      return "Para confirmar, indica al menos un cobro que sume el total de la venta.";
    }
    const sum = paymentsAmountSum(built.payments);
    if (!amountsMatchTotal(sum, estimatedOrderTotal)) {
      return `Los cobros deben sumar el total (${estimatedOrderTotal.toFixed(2)} CUP, tolerancia 0,01).`;
    }
    return null;
  };

  const handleDraftOnly = async () => {
    const v = validateForApi();
    if (v) {
      setFormError(v);
      return;
    }
    const pv = validatePaymentsOptional();
    if (pv) {
      setFormError(pv);
      return;
    }
    setIsSubmitting(true);
    setFormError("");
    try {
      const built = buildPaymentsFromDraft(paymentLines, payCtx);
      const body = buildRequest(
        built.ok && built.payments.length > 0 ? built.payments : undefined,
      );
      await createOrder(body).unwrap();
      toast.success("Venta guardada como borrador.");
      onSuccess?.();
      onClose();
    } catch (e) {
      setFormError(mapSubmitError(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validateForApi();
    if (v) {
      setFormError(v);
      return;
    }
    const pv = validatePaymentsRequiredForConfirm();
    if (pv) {
      setFormError(pv);
      return;
    }
    const built = buildPaymentsFromDraft(paymentLines, payCtx);
    if (!built.ok) {
      setFormError(built.error);
      return;
    }
    setIsSubmitting(true);
    setFormError("");
    try {
      const body = buildRequest(built.payments);
      const created = await createOrder(body).unwrap();
      const id = Number(created.id);
      if (!Number.isFinite(id) || id <= 0) {
        setFormError(
          "La orden se creó pero no se pudo confirmar (ID no válido). Revisa la orden en la lista como borrador.",
        );
        onSuccess?.();
        onClose();
        return;
      }
      await confirmOrder(id).unwrap();
      toast.success(
        created.folio
          ? `Venta confirmada (${created.folio}).`
          : "Venta confirmada.",
      );
      onSuccess?.();
      onClose();
    } catch (e) {
      setFormError(mapSubmitError(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Nueva venta"
      icon="add_shopping_cart"
      maxWidth="min(92vw, 720px)"
      onSubmit={handleConfirmSubmit}
      submitting={isSubmitting}
      submitLabel="Confirmar venta"
      cancelLabel="Cerrar"
      error={formError}
      extraFooterActions={
        <button
          type="button"
          className="modal-btn modal-btn--ghost"
          disabled={isSubmitting}
          onClick={() => void handleDraftOnly()}
        >
          Guardar borrador
        </button>
      }
    >
      <div className="modal-field field-full sale-create-shell">
        <section className="sale-create-section" aria-labelledby="sale-create-store">
          <h3 id="sale-create-store" className="sale-create-section__title">
            Tienda
          </h3>
          <div className="modal-field field-full" style={{ margin: 0 }}>
            <label htmlFor="sale-create-location">Ubicación de la venta</label>
            <select
              id="sale-create-location"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
            >
              <option value="">Seleccionar tienda…</option>
              {locations.map((loc) => (
                <option key={loc.id} value={String(loc.id)}>
                  {loc.name}
                  {loc.code ? ` (${loc.code})` : ""}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="sale-create-section" aria-labelledby="sale-create-products">
          <h3 id="sale-create-products" className="sale-create-section__title">
            Productos
          </h3>
          <div className="sale-create-picker-box" ref={pickRef}>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                alignItems: "stretch",
              }}
            >
              <input
                type="text"
                autoComplete="off"
                aria-label="Buscar producto"
                placeholder="Escribe código o nombre…"
                value={pickSearch}
                onChange={(e) => {
                  setPickSearch(e.target.value);
                  setPickOpen(true);
                }}
                onFocus={() => setPickOpen(true)}
                style={{
                  flex: "1 1 200px",
                  minWidth: 0,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${theme.divider}`,
                  fontSize: 15,
                  background: "#fff",
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label
                  htmlFor="sale-create-pick-qty"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: theme.secondaryText,
                    whiteSpace: "nowrap",
                  }}
                >
                  Cant.
                </label>
                <input
                  id="sale-create-pick-qty"
                  type="text"
                  inputMode="decimal"
                  aria-label="Cantidad al añadir"
                  placeholder="1"
                  value={pickQty}
                  onChange={(e) => setPickQty(e.target.value)}
                  style={{
                    width: 72,
                    padding: "10px 10px",
                    borderRadius: 10,
                    border: `1px solid ${theme.divider}`,
                    fontSize: 15,
                    background: "#fff",
                  }}
                />
              </div>
            </div>
            {pickOpen && filteredPickProducts.length > 0 ? (
              <ul
                className="modal-product-dropdown"
                style={{
                  listStyle: "none",
                  margin: "10px 0 0",
                  padding: 0,
                  maxHeight: 220,
                  overflowY: "auto",
                  border: `1px solid ${theme.divider}`,
                  borderRadius: 10,
                  background: theme.surface,
                  boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
                }}
              >
                {filteredPickProducts.slice(0, 50).map((p) => (
                  <li
                    key={p.id}
                    style={{
                      padding: "12px 14px",
                      cursor: "pointer",
                      fontSize: 14,
                      borderBottom: `1px solid ${theme.divider}`,
                    }}
                    onMouseDown={(ev) => {
                      ev.preventDefault();
                      addProductLine(p);
                    }}
                  >
                    <span style={{ fontWeight: 700, color: theme.primaryText }}>
                      {p.code}
                    </span>
                    <span style={{ color: theme.secondaryText }}>
                      {" "}
                      — {p.name}
                    </span>
                    <span
                      style={{
                        display: "block",
                        marginTop: 4,
                        fontSize: 12,
                        color: theme.hint,
                      }}
                    >
                      Pulsa para añadir · Precio de lista {formatCup(p.precio)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {lines.length === 0 ? (
            <p className="sale-create-empty">
              Aún no hay productos. Busca arriba y pulsa un resultado para
              añadirlo a la venta.
            </p>
          ) : (
            <div className="sale-create-line-list" style={{ marginTop: 14 }}>
              {lines.map((line) => (
                <div key={line.key} className="sale-create-line-card">
                  <div className="sale-create-line-card__text">
                    <span className="sale-create-line-card__name">
                      {line.label}
                    </span>
                    <span className="sale-create-line-card__meta">
                      Precio de lista {formatCup(line.catalogPrice)}
                    </span>
                  </div>
                  <div className="sale-create-line-card__inputs">
                    <div className="sale-create-line-card__field">
                      <span>Cantidad</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        aria-label={`Cantidad ${line.label}`}
                        value={line.quantityStr}
                        onChange={(e) => {
                          const v = e.target.value;
                          setLines((prev) =>
                            prev.map((l) =>
                              l.key === line.key
                                ? { ...l, quantityStr: v }
                                : l,
                            ),
                          );
                        }}
                      />
                    </div>
                    <div className="sale-create-line-card__field">
                      <span>P. unit.</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        aria-label={`Precio unitario ${line.label}`}
                        placeholder={`${line.catalogPrice}`}
                        value={line.unitPriceStr}
                        onChange={(e) => {
                          const v = e.target.value;
                          setLines((prev) =>
                            prev.map((l) =>
                              l.key === line.key
                                ? { ...l, unitPriceStr: v }
                                : l,
                            ),
                          );
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      className="sale-create-line-card__remove"
                      aria-label="Quitar producto"
                      onClick={() =>
                        setLines((prev) =>
                          prev.filter((l) => l.key !== line.key),
                        )
                      }
                    >
                      <Icon name="close" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="sale-create-total" role="status">
          <span className="sale-create-total__label">Total de esta venta</span>
          <span className="sale-create-total__value">
            {formatCup(estimatedOrderTotal)}
          </span>
          <p className="sale-create-total__hint">
            <strong>Confirmar</strong> exige cobros que sumen este total.{" "}
            <strong>Borrador</strong> permite guardar sin cobro y completar el
            cobro más adelante.
          </p>
        </div>

        <details className="sale-create-details">
          <summary>Cliente, notas o descuento (opcional)</summary>
          <div className="sale-create-details__body">
            <div className="sale-create-grid2">
              <div className="modal-field field-full" style={{ margin: 0 }}>
                <label htmlFor="sale-create-contact">Cliente</label>
                <select
                  id="sale-create-contact"
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                >
                  <option value="">Sin cliente</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                      {c.phone ? ` · ${c.phone}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-field field-full" style={{ margin: 0 }}>
                <label htmlFor="sale-create-discount">Descuento global (CUP)</label>
                <input
                  id="sale-create-discount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-field field-full" style={{ margin: 0 }}>
              <label htmlFor="sale-create-notes">Notas internas</label>
              <textarea
                id="sale-create-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones opcionales…"
              />
            </div>
          </div>
        </details>

        <section className="sale-create-section" aria-labelledby="sale-create-pay">
          <h3 id="sale-create-pay" className="sale-create-section__title">
            Forma de cobro
          </h3>
          <p
            style={{
              margin: "0 0 12px",
              fontSize: 13,
              color: theme.secondaryText,
              lineHeight: 1.5,
            }}
          >
            Una fila por medio de pago. Si la moneda no es la base, solo
            indica cuánto cobraste en esa moneda; el equivalente en CUP lo
            calcula la aplicación.
          </p>
          <SalePaymentLinesForm
            methods={paymentMethods}
            lines={paymentLines}
            onChange={setPaymentLines}
            expectedTotal={estimatedOrderTotal}
            disabled={isSubmitting}
            currencies={currencyList}
          />
        </section>
      </div>
    </FormModal>
  );
}
