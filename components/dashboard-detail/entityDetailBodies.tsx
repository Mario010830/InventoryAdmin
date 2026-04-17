"use client";

import { useCallback, useMemo, useState } from "react";
import {
  useGetLoanByIdQuery,
  useRegisterLoanPaymentMutation,
} from "@/app/dashboard/loans/_service/loansApi";
import { FormModal } from "@/components/FormModal";
import { Icon } from "@/components/ui/Icon";
import { useDisplayCurrency } from "@/contexts/DisplayCurrencyContext";
import type { LocationResponse, UserResponse } from "@/lib/auth-types";
import type {
  ContactResponse,
  InventoryMovementResponse,
  InventoryResponse,
  LeadResponse,
  LoanResponse,
  LogResponse,
  ProductCategoryResponse,
  PaymentMethodResponse,
  ProductResponse,
  RoleResponse,
  SupplierResponse,
} from "@/lib/dashboard-types";
import {
  displayDash,
  formatDetailDate,
  formatDetailDateTime,
} from "@/lib/formatDetailDate";
import {
  formatMovementReason,
  movementTypeLabel,
} from "@/lib/inventoryMovementUi";
import { formatLoanMoneyDisplay } from "@/lib/loanMoneyDisplay";
import { formatLoanInterestLine } from "@/lib/loan-interest";
import { getProxiedImageSrc } from "@/lib/proxiedImageSrc";
import { BoolBadge, DetailField, DetailSection } from "./DetailPrimitives";
import { LocationPublicCatalogSection } from "./LocationPublicCatalogSection";

function marginPercent(row: ProductResponse): string {
  const p = Number(row.precio);
  const c = Number(row.costo);
  if (!Number.isFinite(p) || !Number.isFinite(c)) return "—";
  if (p <= 0) return "—";
  return `${(((p - c) / p) * 100).toFixed(1)}%`;
}

export function ProductDetailBody({
  row,
  categoryName,
  locations = [],
}: {
  row: ProductResponse;
  categoryName: string;
  /** Para resolver nombres de tiendas en productos elaborados (`offerLocationIds`). */
  locations?: { id: number; name: string }[];
}) {
  const { formatCup } = useDisplayCurrency();
  const stock = row.totalStock;
  const imgSrc = row.imagenUrl?.trim()
    ? (getProxiedImageSrc(row.imagenUrl) ?? row.imagenUrl)
    : null;
  return (
    <>
      {imgSrc ? (
        <div className="gd-detail-photo-block">
          <img
            src={imgSrc}
            alt={row.name ? `Foto de ${row.name}` : "Foto del producto"}
            className="gd-detail-photo"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="gd-detail-photo-block gd-detail-photo-block--empty">
          <Icon name="inventory_2" aria-hidden />
          <span>Sin foto</span>
        </div>
      )}
      <DetailSection title="General">
        <div className="gd-detail-section__grid gd-detail-section__grid--two">
          <DetailField label="Código" value={displayDash(row.code)} />
          <DetailField label="Nombre" value={displayDash(row.name)} />
          <DetailField
            label="Descripción"
            value={displayDash(
              row.description?.trim() ? row.description : null,
            )}
          />
          <DetailField label="Categoría" value={displayDash(categoryName)} />
        </div>
      </DetailSection>
      <DetailSection title="Precios">
        <div className="gd-detail-section__grid gd-detail-section__grid--two">
          <DetailField label="Precio" value={formatCup(Number(row.precio))} />
          <DetailField label="Costo" value={formatCup(Number(row.costo))} />
          <DetailField label="Margen %" value={marginPercent(row)} />
        </div>
      </DetailSection>
      <DetailSection title="Estado">
        <div className="gd-detail-section__grid gd-detail-section__grid--two">
          <DetailField
            label="Disponible"
            value={
              <BoolBadge
                value={row.isAvailable}
                trueLabel="Sí"
                falseLabel="No"
              />
            }
          />
          <DetailField
            label="En venta"
            value={
              <BoolBadge value={row.isForSale} trueLabel="Sí" falseLabel="No" />
            }
          />
          <DetailField
            label="Stock actual"
            value={
              stock != null && Number.isFinite(Number(stock))
                ? String(stock)
                : "—"
            }
          />
          <DetailField
            label="Tipo"
            value={
              row.tipo === "elaborado"
                ? "Elaborado"
                : row.tipo === "inventariable"
                  ? "Inventariable"
                  : displayDash(null)
            }
          />
        </div>
      </DetailSection>
      {row.tipo === "elaborado" && (
        <DetailSection title="Disponibilidad por tienda (elaborado)">
          <DetailField
            label="Tiendas donde se ofrece"
            value={
              row.offerLocationIds == null || row.offerLocationIds.length === 0
                ? "Ninguna (no visible en tiendas hasta asignar)"
                : row.offerLocationIds
                    .map(
                      (id) =>
                        locations.find((l) => l.id === id)?.name?.trim() ||
                        `Tienda #${id}`,
                    )
                    .join(", ")
            }
          />
        </DetailSection>
      )}
      <DetailSection title="Fechas">
        <div className="gd-detail-section__grid gd-detail-section__grid--two">
          <DetailField label="Creado" value={formatDetailDate(row.createdAt)} />
          <DetailField
            label="Última actualización"
            value={formatDetailDate(row.modifiedAt)}
          />
        </div>
      </DetailSection>
    </>
  );
}

export function CategoryDetailBody({
  row,
  productCount,
}: {
  row: ProductCategoryResponse;
  productCount: number | null;
}) {
  return (
    <>
      <DetailField label="Nombre" value={displayDash(row.name)} />
      <DetailField
        label="Descripción"
        value={displayDash(row.description?.trim() ? row.description : null)}
      />
      <DetailField
        label="Estado"
        value={<span className="dt-tag dt-tag--green">Activo</span>}
      />
      <DetailField
        label="Total productos en categoría"
        value={productCount != null ? String(productCount) : "—"}
      />
      <DetailField label="Creado" value={formatDetailDate(row.createdAt)} />
      <DetailField
        label="Última actualización"
        value={formatDetailDate(row.modifiedAt)}
      />
    </>
  );
}

export function ContactDetailBody({
  row,
  assignedUserName,
}: {
  row: ContactResponse;
  assignedUserName?: string | null;
}) {
  return (
    <>
      <DetailSection title="General">
        <div className="gd-detail-section__grid gd-detail-section__grid--two">
          <DetailField label="Nombre" value={displayDash(row.name)} />
          <DetailField label="Empresa" value={displayDash(row.company)} />
          <DetailField
            label="Persona de contacto"
            value={displayDash(row.contactPerson)}
          />
          <DetailField label="Email" value={displayDash(row.email)} />
          <DetailField label="Teléfono" value={displayDash(row.phone)} />
          <DetailField label="Origen" value={displayDash(row.origin)} />
          <DetailField label="Dirección" value={displayDash(row.address)} />
          <DetailField
            label="Asignado a"
            value={displayDash(
              assignedUserName ??
                (row.assignedUserId != null
                  ? `Usuario #${row.assignedUserId}`
                  : null),
            )}
          />
        </div>
      </DetailSection>
      {row.notes?.trim() ? (
        <DetailSection title="Notas">
          <DetailField label="" value={row.notes} />
        </DetailSection>
      ) : null}
      <DetailSection title="Estado">
        <DetailField
          label="Activo"
          value={
            <BoolBadge value={row.isActive} trueLabel="Sí" falseLabel="No" />
          }
        />
      </DetailSection>
      <DetailSection title="Fechas">
        <div className="gd-detail-section__grid gd-detail-section__grid--two">
          <DetailField label="Creado" value={formatDetailDate(row.createdAt)} />
          <DetailField
            label="Última actualización"
            value={formatDetailDate(row.modifiedAt)}
          />
        </div>
      </DetailSection>
    </>
  );
}

export function LeadDetailBody({
  row,
  assignedUserName,
}: {
  row: LeadResponse;
  assignedUserName?: string | null;
}) {
  const converted = row.convertedToContactId != null;
  return (
    <>
      <DetailSection title="General">
        <div className="gd-detail-section__grid gd-detail-section__grid--two">
          <DetailField label="Nombre" value={displayDash(row.name)} />
          <DetailField label="Empresa" value={displayDash(row.company)} />
          <DetailField
            label="Persona de contacto"
            value={displayDash(row.contactPerson)}
          />
          <DetailField label="Email" value={displayDash(row.email)} />
          <DetailField label="Teléfono" value={displayDash(row.phone)} />
          <DetailField label="Origen" value={displayDash(row.origin)} />
          <DetailField label="Estado" value={displayDash(row.status)} />
          <DetailField
            label="Asignado a"
            value={displayDash(
              assignedUserName ??
                (row.assignedUserId != null
                  ? `Usuario #${row.assignedUserId}`
                  : null),
            )}
          />
        </div>
      </DetailSection>
      {converted ? (
        <DetailSection title="Conversión">
          <DetailField
            label="Contacto creado"
            value={`ID ${row.convertedToContactId}`}
          />
          <DetailField
            label="Fecha de conversión"
            value={
              row.convertedAt ? formatDetailDateTime(row.convertedAt) : "—"
            }
          />
        </DetailSection>
      ) : null}
      {row.notes?.trim() ? (
        <DetailSection title="Notas">
          <DetailField label="" value={row.notes} />
        </DetailSection>
      ) : null}
      <DetailSection title="Fechas">
        <div className="gd-detail-section__grid gd-detail-section__grid--two">
          <DetailField label="Creado" value={formatDetailDate(row.createdAt)} />
          <DetailField
            label="Última actualización"
            value={formatDetailDate(row.modifiedAt)}
          />
        </div>
      </DetailSection>
    </>
  );
}

function isoToDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localDatetimeToIso(val: string): string {
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export function LoanDetailBody({
  row,
  canRegisterPayment,
}: {
  row: LoanResponse;
  canRegisterPayment: boolean;
}) {
  const { formatCup, priceDecimals } = useDisplayCurrency();
  const { data, isLoading, isError } = useGetLoanByIdQuery(row.id);
  const loan = data ?? row;
  const payments = loan.payments ?? [];

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payAt, setPayAt] = useState(() =>
    isoToDatetimeLocalValue(new Date().toISOString()),
  );
  const [payNotes, setPayNotes] = useState("");
  const [payError, setPayError] = useState("");
  const [registerPayment, { isLoading: paySubmitting }] =
    useRegisterLoanPaymentMutation();

  const openPayment = useCallback(() => {
    setPayAmount("");
    setPayAt(isoToDatetimeLocalValue(new Date().toISOString()));
    setPayNotes("");
    setPayError("");
    setPaymentOpen(true);
  }, []);

  const closePayment = useCallback(() => setPaymentOpen(false), []);

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(String(payAmount).replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      setPayError("Indica un importe mayor que cero.");
      return;
    }
    setPayError("");
    try {
      await registerPayment({
        loanId: row.id,
        body: {
          amount,
          paidAt: localDatetimeToIso(payAt),
          notes: payNotes.trim() || null,
        },
      }).unwrap();
      closePayment();
    } catch (err) {
      setPayError(
        err instanceof Error ? err.message : "No se pudo registrar el cobro.",
      );
    }
  };

  const sortedPayments = useMemo(
    () =>
      [...payments].sort(
        (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
      ),
    [payments],
  );

  return (
    <>
      {isLoading && !data ? (
        <p style={{ margin: "8px 0", color: "#64748b" }}>
          Cargando detalle del préstamo…
        </p>
      ) : null}
      {isError ? (
        <p style={{ margin: "8px 0", color: "#b45309" }}>
          No se pudo sincronizar el detalle con el servidor. Se muestran los
          datos del listado.
        </p>
      ) : null}

      <DetailSection title="Importes">
        <div className="gd-detail-section__grid gd-detail-section__grid--two">
          <DetailField
            label="Capital"
            value={formatLoanMoneyDisplay(loan, Number(loan.principalAmount), {
              fallback: formatCup,
              decimals: priceDecimals,
            })}
          />
          <DetailField
            label="Cobrado"
            value={formatLoanMoneyDisplay(loan, Number(loan.totalPaid), {
              fallback: formatCup,
              decimals: priceDecimals,
            })}
          />
          <DetailField
            label="Pendiente (capital)"
            value={formatLoanMoneyDisplay(
              loan,
              Number(loan.outstandingPrincipal),
              { fallback: formatCup, decimals: priceDecimals },
            )}
          />
          <DetailField
            label="Interés estimado"
            value={formatLoanMoneyDisplay(
              loan,
              Number(loan.estimatedInterest),
              { fallback: formatCup, decimals: priceDecimals },
            )}
          />
          <DetailField
            label="Saldo estimado total"
            value={formatLoanMoneyDisplay(
              loan,
              Number(loan.estimatedTotalDue),
              { fallback: formatCup, decimals: priceDecimals },
            )}
          />
        </div>
        <p
          style={{
            margin: "8px 0 0",
            fontSize: "0.75rem",
            lineHeight: 1.45,
            color: "#64748b",
          }}
        >
          El interés estimado y el saldo total usan interés simple según la
          periodicidad de la tasa indicada en condiciones.
        </p>
      </DetailSection>

      <DetailSection title="Condiciones">
        <div className="gd-detail-section__grid gd-detail-section__grid--two">
          <DetailField label="Deudor" value={displayDash(loan.debtorName)} />
          <DetailField
            label="Tasa de interés"
            value={formatLoanInterestLine(
              loan.interestPercent,
              loan.interestRatePeriod,
              (
                loan as LoanResponse & {
                  interestPercentPerYear?: number | null;
                }
              ).interestPercentPerYear,
            )}
          />
          <DetailField
            label="Inicio interés"
            value={
              loan.interestStartDate
                ? formatDetailDate(loan.interestStartDate)
                : "—"
            }
          />
        </div>
        {(loan.dueDates?.length ?? 0) > 0 ? (
          <DetailField
            label="Fechas previstas de cobro"
            value={
              <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                {(loan.dueDates ?? []).map((d) => (
                  <li key={d}>{formatDetailDate(d)}</li>
                ))}
              </ul>
            }
          />
        ) : null}
      </DetailSection>

      {loan.notes?.trim() ? (
        <DetailSection title="Notas">
          <DetailField label="" value={loan.notes} />
        </DetailSection>
      ) : null}

      <DetailSection title="Cobros registrados">
        {canRegisterPayment && loan.outstandingPrincipal > 0 ? (
          <div style={{ marginBottom: 12 }}>
            <button
              type="button"
              className="modal-btn modal-btn--primary"
              onClick={openPayment}
            >
              Registrar cobro
            </button>
          </div>
        ) : null}
        {sortedPayments.length === 0 ? (
          <p style={{ margin: 0, color: "#64748b" }}>Sin cobros registrados.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.875rem",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ textAlign: "left", padding: "6px 8px" }}>
                    Importe
                  </th>
                  <th style={{ textAlign: "left", padding: "6px 8px" }}>
                    Fecha
                  </th>
                  <th style={{ textAlign: "left", padding: "6px 8px" }}>
                    Notas
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedPayments.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px" }}>
                      {formatLoanMoneyDisplay(loan, Number(p.amount), {
                        fallback: formatCup,
                        decimals: priceDecimals,
                      })}
                    </td>
                    <td style={{ padding: "8px" }}>
                      {formatDetailDateTime(p.paidAt)}
                    </td>
                    <td style={{ padding: "8px" }}>{displayDash(p.notes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DetailSection>

      <DetailSection title="Fechas">
        <div className="gd-detail-section__grid gd-detail-section__grid--two">
          <DetailField
            label="Creado"
            value={formatDetailDate(loan.createdAt)}
          />
          <DetailField
            label="Última actualización"
            value={formatDetailDate(loan.modifiedAt)}
          />
        </div>
      </DetailSection>

      {paymentOpen ? (
        <FormModal
          open={paymentOpen}
          onClose={closePayment}
          title="Registrar cobro"
          icon="payments"
          onSubmit={handlePaymentSubmit}
          submitting={paySubmitting}
          submitLabel="Registrar"
          error={payError}
        >
          <div className="modal-field">
            <label htmlFor="loan-pay-amount">Importe *</label>
            <input
              id="loan-pay-amount"
              type="number"
              min={0}
              step="0.01"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
          </div>
          <div className="modal-field">
            <label htmlFor="loan-pay-at">Fecha y hora</label>
            <input
              id="loan-pay-at"
              type="datetime-local"
              value={payAt}
              onChange={(e) => setPayAt(e.target.value)}
            />
          </div>
          <div className="modal-field field-full">
            <label htmlFor="loan-pay-notes">Notas</label>
            <textarea
              id="loan-pay-notes"
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              rows={2}
            />
          </div>
        </FormModal>
      ) : null}
    </>
  );
}

export function PaymentMethodDetailBody({ row }: { row: PaymentMethodResponse }) {
  return (
    <>
      <DetailSection title="General">
        <div className="gd-detail-section__grid gd-detail-section__grid--two">
          <DetailField label="Nombre" value={displayDash(row.name)} />
          <DetailField
            label="Referencia del instrumento"
            value={displayDash(row.instrumentReference)}
          />
          <DetailField label="Orden" value={String(row.sortOrder ?? "—")} />
          <DetailField
            label="Organización (id)"
            value={String(row.organizationId ?? "—")}
          />
        </div>
      </DetailSection>
      <DetailSection title="Estado">
        <div className="gd-detail-section__grid gd-detail-section__grid--two">
          <DetailField
            label="Estado"
            value={
              <BoolBadge
                value={row.isActive}
                trueLabel="Activo"
                falseLabel="Inactivo"
              />
            }
          />
        </div>
      </DetailSection>
      <DetailSection title="Fechas">
        <div className="gd-detail-section__grid gd-detail-section__grid--two">
          <DetailField label="Creado" value={formatDetailDate(row.createdAt)} />
          <DetailField
            label="Última actualización"
            value={formatDetailDate(row.modifiedAt)}
          />
        </div>
      </DetailSection>
    </>
  );
}

export function SupplierDetailBody({ row }: { row: SupplierResponse }) {
  return (
    <>
      <DetailSection title="General">
        <div className="gd-detail-section__grid gd-detail-section__grid--two">
          <DetailField label="Nombre" value={displayDash(row.name)} />
          <DetailField
            label="Contacto"
            value={displayDash(row.contactPerson)}
          />
          <DetailField label="Email" value={displayDash(row.email)} />
          <DetailField label="Teléfono" value={displayDash(row.phone)} />
        </div>
      </DetailSection>
      <DetailSection title="Estado">
        <div className="gd-detail-section__grid gd-detail-section__grid--two">
          <DetailField
            label="Estado"
            value={
              <BoolBadge
                value={row.isActive}
                trueLabel="Activo"
                falseLabel="Inactivo"
              />
            }
          />
          <DetailField label="País" value="—" />
        </div>
      </DetailSection>
      <DetailSection title="Fechas">
        <div className="gd-detail-section__grid gd-detail-section__grid--two">
          <DetailField label="Creado" value={formatDetailDate(row.createdAt)} />
          <DetailField
            label="Última actualización"
            value={formatDetailDate(row.modifiedAt)}
          />
        </div>
      </DetailSection>
    </>
  );
}

export function LocationDetailBody({ row }: { row: LocationResponse }) {
  const photo = row.photoUrl?.trim();
  const imgSrc = photo ? (getProxiedImageSrc(photo) ?? photo) : null;
  return (
    <>
      {imgSrc ? (
        <div className="gd-detail-photo-block">
          <img
            src={imgSrc}
            alt={row.name ? `Foto de ${row.name}` : "Foto de la ubicación"}
            className="gd-detail-photo"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="gd-detail-photo-block gd-detail-photo-block--empty">
          <Icon name="location_on" aria-hidden />
          <span>Sin foto</span>
        </div>
      )}
      <LocationPublicCatalogSection locationName={row.name ?? ""} />
      <DetailField label="Nombre" value={displayDash(row.name)} />
      <DetailField label="Código" value={displayDash(row.code)} />
      <DetailField
        label="Domicilio"
        value={
          row.offersDelivery !== false ? (
            <span className="dt-tag dt-tag--green">Sí</span>
          ) : (
            <span className="dt-tag dt-tag--neutral">No</span>
          )
        }
      />
      <DetailField
        label="Recogida en tienda"
        value={
          row.offersPickup !== false ? (
            <span className="dt-tag dt-tag--green">Sí</span>
          ) : (
            <span className="dt-tag dt-tag--neutral">No</span>
          )
        }
      />
      <DetailField label="Tipo" value="—" />
      <DetailField label="Capacidad" value="—" />
      <DetailField
        label="Estado"
        value={<span className="dt-tag dt-tag--green">Activo</span>}
      />
      <DetailField label="Creado" value={formatDetailDate(row.createdAt)} />
      <DetailField
        label="Última actualización"
        value={formatDetailDate(row.modifiedAt)}
      />
    </>
  );
}

export function InventoryDetailBody({
  row,
  categoryName,
}: {
  row: InventoryResponse;
  categoryName: string;
}) {
  const max = row.maximumStock;
  return (
    <div className="gd-detail-section__grid gd-detail-section__grid--two">
      <DetailField label="Producto" value={displayDash(row.productName)} />
      <DetailField label="Categoría" value={displayDash(categoryName)} />
      <DetailField label="Ubicación" value={displayDash(row.locationName)} />
      <DetailField label="Stock actual" value={String(row.currentStock)} />
      <DetailField label="Stock mínimo" value={String(row.minimumStock)} />
      <DetailField
        label="Stock máximo"
        value={max != null && Number.isFinite(max) ? String(max) : "—"}
      />
      <DetailField
        label="Última actualización"
        value={formatDetailDate(row.modifiedAt)}
      />
      <DetailField
        label="Actualizado por"
        value={displayDash(row.modifiedByUserName)}
      />
    </div>
  );
}

function movementUserLabel(
  row: InventoryMovementResponse,
  userIdToName: Map<number, string>,
): string {
  const uid = row.userId;
  if (uid == null || uid <= 0) return "—";
  const fromApi = (row.userFullName ?? row.userName)?.trim();
  if (fromApi) return fromApi;
  return userIdToName.get(uid) ?? "—";
}

function movementProductLabel(
  row: InventoryMovementResponse,
  productLabelById: Map<number, string>,
): string {
  if (row.productName?.trim()) return row.productName.trim();
  const fallback = productLabelById.get(row.productId);
  return fallback ?? String(row.productId);
}

export function MovementDetailBody({
  row,
  userIdToName,
  productLabelById,
}: {
  row: InventoryMovementResponse;
  userIdToName: Map<number, string>;
  productLabelById: Map<number, string>;
}) {
  const typeLabel = movementTypeLabel(row.type);
  return (
    <>
      <DetailSection title="General">
        <div className="gd-detail-section__grid gd-detail-section__grid--two">
          <DetailField label="ID" value={String(row.id)} />
          <DetailField label="Tipo" value={typeLabel} />
          <DetailField
            label="Producto"
            value={movementProductLabel(row, productLabelById)}
          />
          <DetailField label="Cantidad" value={String(row.quantity)} />
        </div>
      </DetailSection>
      <DetailSection title="Stock">
        <div className="gd-detail-section__grid gd-detail-section__grid--two">
          <DetailField
            label="Stock anterior"
            value={row.previousStock != null ? String(row.previousStock) : "—"}
          />
          <DetailField
            label="Stock nuevo"
            value={row.newStock != null ? String(row.newStock) : "—"}
          />
        </div>
      </DetailSection>
      <DetailSection title="Contexto">
        <div className="gd-detail-section__grid gd-detail-section__grid--two">
          <DetailField
            label="Ubicación"
            value={displayDash(row.locationName)}
          />
          <DetailField label="Razón" value={formatMovementReason(row.reason)} />
          <DetailField
            label="Usuario"
            value={movementUserLabel(row, userIdToName)}
          />
          <DetailField label="Fecha" value={formatDetailDate(row.createdAt)} />
        </div>
      </DetailSection>
    </>
  );
}

export function UserDetailBody({
  row,
  roleName,
}: {
  row: UserResponse;
  roleName: string;
}) {
  const active = String(row.status ?? "").toUpperCase() === "ACTIVE";
  const ext = row as UserResponse & {
    lastLoginAt?: string;
    lastAccessAt?: string;
    lastLogin?: string;
  };
  const last = ext.lastLoginAt ?? ext.lastAccessAt ?? ext.lastLogin;
  return (
    <>
      <DetailField label="Nombre" value={displayDash(row.fullName)} />
      <DetailField label="Email" value={displayDash(row.email)} />
      <DetailField label="Rol" value={displayDash(roleName)} />
      <DetailField
        label="Estado"
        value={
          <BoolBadge value={active} trueLabel="Activo" falseLabel="Inactivo" />
        }
      />
      <DetailField
        label="Último acceso"
        value={last ? formatDetailDateTime(String(last)) : "—"}
      />
      <DetailField label="Creado" value="—" />
      <DetailField label="Última actualización" value="—" />
    </>
  );
}

export function RoleDetailBody({
  row,
  userCount,
  permissionNames,
}: {
  row: RoleResponse;
  userCount: number;
  permissionNames: string[];
}) {
  return (
    <>
      <DetailField label="Nombre" value={displayDash(row.name)} />
      <DetailField
        label="Descripción"
        value={displayDash(row.description?.trim() ? row.description : null)}
      />
      <DetailField
        label="Estado"
        value={
          <span
            className={`dt-tag ${row.isSystem ? "dt-tag--red" : "dt-tag--green"}`}
          >
            {row.isSystem ? "Sistema" : "Personalizado"}
          </span>
        }
      />
      <DetailField
        label="Total usuarios con este rol"
        value={String(userCount)}
      />
      <DetailField
        label="Permisos asignados"
        value={
          permissionNames.length === 0 ? (
            "—"
          ) : (
            <ul className="gd-detail-list">
              {permissionNames.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )
        }
      />
    </>
  );
}

export function LogDetailBody({
  row,
  userLabel,
}: {
  row: LogResponse;
  userLabel: string;
}) {
  const ext = row as LogResponse & { ip?: string; ipAddress?: string };
  const ip = ext.ipAddress ?? ext.ip;
  return (
    <>
      <DetailField label="ID" value={String(row.id)} />
      <DetailField label="Tipo de acción" value={displayDash(row.logType)} />
      <DetailField label="Descripción" value={displayDash(row.description)} />
      <DetailField label="Usuario" value={displayDash(userLabel)} />
      <DetailField
        label="Fecha y hora exacta"
        value={formatDetailDateTime(row.createdAt)}
      />
      <DetailField label="IP" value={ip ? displayDash(ip) : "—"} />
    </>
  );
}
