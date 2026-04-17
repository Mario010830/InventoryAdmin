import type { CreateSaleOrderPaymentRequest } from "@/lib/dashboard-types";

/** Redondeo monetario a 2 decimales (comparación con total de orden). */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function parseMoney(s: string): number {
  const n = parseFloat(s.trim().replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

export function paymentsAmountSum(
  amounts: readonly { amount: number }[],
): number {
  return round2(amounts.reduce((a, p) => a + p.amount, 0));
}

/** Tolerancia 0,01 como en el API al confirmar. */
export function amountsMatchTotal(
  sumPayments: number,
  orderTotal: number,
  tol = 0.01,
): boolean {
  return Math.abs(round2(sumPayments) - round2(orderTotal)) <= tol;
}

export function parseQtyStrict(s: string): number {
  const n = parseFloat(s.trim().replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

export type LineForTotalEstimate = {
  quantityStr: string;
  unitPriceStr: string;
  catalogPrice: number;
};

/** Estima total (subtotal líneas − descuento global), alineado con el modal de venta. */
export function estimateOrderTotalFromLines(
  lines: readonly LineForTotalEstimate[],
  discountStr: string,
): number {
  let sub = 0;
  for (const line of lines) {
    const qty = parseQtyStrict(line.quantityStr);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const upRaw = line.unitPriceStr.trim().replace(",", ".");
    const upParsed = upRaw === "" ? NaN : parseFloat(upRaw);
    const unit =
      Number.isFinite(upParsed) && (upParsed as number) >= 0
        ? (upParsed as number)
        : line.catalogPrice;
    sub += qty * unit;
  }
  const disc = parseMoney(discountStr);
  const d = Number.isFinite(disc) && disc > 0 ? disc : 0;
  return round2(Math.max(0, sub - d));
}

export type PaymentLineDraft = {
  key: string;
  paymentMethodId: number;
  amountStr: string;
  reference: string;
};

export function newPaymentLineKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function newPaymentLine(firstMethodId: number): PaymentLineDraft {
  return {
    key: newPaymentLineKey(),
    paymentMethodId: firstMethodId,
    amountStr: "",
    reference: "",
  };
}

export function buildPaymentsFromDraft(
  lines: readonly PaymentLineDraft[],
):
  | { ok: true; payments: CreateSaleOrderPaymentRequest[] }
  | { ok: false; error: string } {
  const payments: CreateSaleOrderPaymentRequest[] = [];
  for (const ln of lines) {
    const amt = parseMoney(ln.amountStr);
    if (!Number.isFinite(amt) || amt <= 0) continue;
    if (!ln.paymentMethodId || ln.paymentMethodId <= 0) {
      return {
        ok: false,
        error: "Cada línea de pago con importe debe tener un método.",
      };
    }
    if (amt < 0.01) {
      return { ok: false, error: "Cada importe debe ser al menos 0,01." };
    }
    const ref = ln.reference.trim();
    payments.push({
      paymentMethodId: ln.paymentMethodId,
      amount: round2(amt),
      reference: ref === "" ? null : ref.slice(0, 120),
    });
  }
  return { ok: true, payments };
}
