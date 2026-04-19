import type {
  CreateSaleOrderPaymentRequest,
  CurrencyResponse,
  SaleOrderPaymentDenominationLineRequest,
  SaleOrderPaymentResponse,
} from "@/lib/dashboard-types";
import { roundPriceDecimals } from "@/lib/displayCurrencyFormat";

/** Redondeo monetario a 2 decimales (comparación con total de orden en CUP). */
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

/** Tolerancia 0,01 como en el API al confirmar (suma CUP). */
export function amountsMatchTotal(
  sumPayments: number,
  orderTotal: number,
  tol = 0.01,
): boolean {
  return Math.abs(round2(sumPayments) - round2(orderTotal)) <= tol;
}

/** CUP aportado por la línea: en extranjero = redondear(amountForeign * tasa, decimalesPrecio). */
export function cupAmountForPaymentLine(
  ln: PaymentLineDraft,
  priceDecimals: number,
  currencies: readonly CurrencyResponse[],
): number {
  const cid = ln.payCurrencyId;
  if (cid == null || cid <= 0) {
    const a = parseMoney(ln.amountStr);
    return Number.isFinite(a) && a > 0 ? round2(a) : 0;
  }
  const cur = currencies.find((c) => c.id === cid);
  if (!cur || cur.isBase) return 0;
  const rate = cur.exchangeRate;
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  const af = parseMoney(ln.amountForeignStr);
  if (!Number.isFinite(af) || af < 0.01) return 0;
  return roundPriceDecimals(af * rate, priceDecimals);
}

/**
 * Importe en moneda extranjera tal que round(af * rate, dec) ≈ targetCup (para «Llenar total»).
 */
export function amountForeignForTargetCup(
  targetCup: number,
  exchangeRate: number,
  priceDecimals: number,
): number {
  if (!Number.isFinite(targetCup) || targetCup <= 0) return NaN;
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) return NaN;
  let af = targetCup / exchangeRate;
  for (let i = 0; i < 40; i++) {
    const cup = roundPriceDecimals(af * exchangeRate, priceDecimals);
    if (Math.abs(round2(cup) - round2(targetCup)) <= 0.001) return af;
    af += (targetCup - cup) / exchangeRate;
  }
  return af;
}

/** Suma billetes: Σ value×qty − Σ change ≈ amountForeign (tolerancia API 0,02). */
export function denominationNetMatchesForeign(
  tender: readonly SaleOrderPaymentDenominationLineRequest[],
  change: readonly SaleOrderPaymentDenominationLineRequest[],
  amountForeign: number,
  tol = 0.02,
): boolean {
  const sumT = tender.reduce((a, x) => a + x.value * x.quantity, 0);
  const sumC = change.reduce((a, x) => a + x.value * x.quantity, 0);
  const net = round2(sumT - sumC);
  return Math.abs(net - round2(amountForeign)) <= tol;
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

export type DenomQtyRow = {
  value: number;
  quantityStr: string;
};

/** Alinea filas de billetes con el catálogo activo conservando cantidades ya indicadas. */
export function mergeDenomRows(
  rows: readonly DenomQtyRow[],
  catalogValues: readonly number[],
): DenomQtyRow[] {
  const byV = new Map(rows.map((r) => [r.value, r.quantityStr]));
  return catalogValues.map((v) => ({
    value: v,
    quantityStr: byV.get(v) ?? "",
  }));
}

export type PaymentLineDraft = {
  key: string;
  paymentMethodId: number;
  amountStr: string;
  reference: string;
  /**
   * null = línea solo CUP (no se envía currencyId al API).
   * Id de moneda no base de la organización.
   */
  payCurrencyId: number | null;
  amountForeignStr: string;
  /** Tasas mostradas por GET /currency; al enviar debe coincidir con la de BD. */
  exchangeRateSnapshotStr: string;
  tenderDenomRows: DenomQtyRow[];
  changeDenomRows: DenomQtyRow[];
  /** Valores faciales activos cargados para validar al guardar. */
  allowedDenomValues?: readonly number[];
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
    payCurrencyId: null,
    amountForeignStr: "",
    exchangeRateSnapshotStr: "",
    tenderDenomRows: [],
    changeDenomRows: [],
    allowedDenomValues: undefined,
  };
}

function parseDenomKind(
  raw: string | undefined,
): "tender" | "change" | null {
  const k = (raw ?? "").trim().toLowerCase();
  if (k === "tender" || k === "change") return k;
  return null;
}

export function paymentLineDraftFromApiPayment(
  p: SaleOrderPaymentResponse,
): PaymentLineDraft {
  const tender: DenomQtyRow[] = [];
  const change: DenomQtyRow[] = [];
  for (const d of p.denominations ?? []) {
    const raw = d as unknown as Record<string, unknown>;
    const kind =
      parseDenomKind(String(raw.kind ?? raw.Kind ?? "")) ??
      parseDenomKind(d.kind);
    const value = Number(raw.value ?? raw.Value ?? d.value);
    const qtyRaw = Number(raw.quantity ?? raw.Quantity ?? d.quantity);
    const row: DenomQtyRow = {
      value: Number.isFinite(value) ? value : 0,
      quantityStr: String(Math.trunc(Number.isFinite(qtyRaw) ? qtyRaw : 0)),
    };
    if (kind === "change") change.push(row);
    else tender.push(row);
  }
  const cid = p.currencyId ?? null;
  const isForeign = cid != null && cid > 0;
  return {
    key: newPaymentLineKey(),
    paymentMethodId: p.paymentMethodId,
    /** En extranjero el CUP se deriva de amountForeign al guardar; no se edita a mano. */
    amountStr: isForeign ? "" : String(round2(p.amount)),
    reference: (p.reference ?? "").slice(0, 120),
    payCurrencyId: isForeign ? cid : null,
    amountForeignStr:
      p.amountForeign != null && Number.isFinite(p.amountForeign)
        ? String(p.amountForeign)
        : "",
    exchangeRateSnapshotStr:
      p.exchangeRateSnapshot != null &&
      Number.isFinite(p.exchangeRateSnapshot)
        ? String(p.exchangeRateSnapshot)
        : "",
    tenderDenomRows: tender,
    changeDenomRows: change,
    allowedDenomValues: undefined,
  };
}

function denomRowsToApiLines(
  rows: readonly DenomQtyRow[],
): SaleOrderPaymentDenominationLineRequest[] {
  const out: SaleOrderPaymentDenominationLineRequest[] = [];
  for (const r of rows) {
    const q = parseInt(r.quantityStr.trim(), 10);
    if (!Number.isFinite(r.value) || r.value <= 0) continue;
    if (!Number.isFinite(q) || q <= 0) continue;
    out.push({ value: r.value, quantity: q });
  }
  return out;
}

export type BuildPaymentsContext = {
  priceDecimals: number;
  currencies: readonly CurrencyResponse[];
};

export function buildPaymentsFromDraft(
  lines: readonly PaymentLineDraft[],
  ctx: BuildPaymentsContext,
):
  | { ok: true; payments: CreateSaleOrderPaymentRequest[] }
  | { ok: false; error: string } {
  const payments: CreateSaleOrderPaymentRequest[] = [];

  for (const ln of lines) {
    if (!ln.paymentMethodId || ln.paymentMethodId <= 0) {
      return {
        ok: false,
        error: "Cada línea de pago con importe debe tener un método.",
      };
    }

    const ref = ln.reference.trim();
    const cid = ln.payCurrencyId;

    if (cid == null || cid <= 0) {
      const amt = parseMoney(ln.amountStr);
      if (!Number.isFinite(amt) || amt <= 0) continue;
      if (amt < 0.01) {
        return { ok: false, error: "Cada importe debe ser al menos 0,01." };
      }
      payments.push({
        paymentMethodId: ln.paymentMethodId,
        amount: round2(amt),
        reference: ref === "" ? null : ref.slice(0, 120),
      });
      continue;
    }

    const cur = ctx.currencies.find((c) => c.id === cid);
    if (!cur) {
      return {
        ok: false,
        error: "Moneda de la línea de pago no encontrada o inactiva.",
      };
    }
    if (cur.isBase) {
      return {
        ok: false,
        error:
          "Para CUP elige «CUP (base)» en moneda e importa en CUP en la misma columna.",
      };
    }
    if (!cur.isActive) {
      return { ok: false, error: `La moneda ${cur.code} no está activa.` };
    }

    const rateLive = cur.exchangeRate;
    if (!Number.isFinite(rateLive) || rateLive <= 0) {
      return { ok: false, error: "Tasa de cambio inválida para la moneda." };
    }

    const af = parseMoney(ln.amountForeignStr);
    if (!Number.isFinite(af) || af < 0.01) {
      return {
        ok: false,
        error: `Indica cuánto se pagó en ${cur.code} (≥ 0,01). El importe en CUP se calcula automáticamente.`,
      };
    }

    const amountCup = roundPriceDecimals(af * rateLive, ctx.priceDecimals);
    if (!Number.isFinite(amountCup) || amountCup < 0.01) {
      return {
        ok: false,
        error: "El importe en CUP calculado es demasiado bajo; revisa cantidad o tasa.",
      };
    }

    const base: CreateSaleOrderPaymentRequest = {
      paymentMethodId: ln.paymentMethodId,
      amount: amountCup,
      reference: ref === "" ? null : ref.slice(0, 120),
    };

    const tender = denomRowsToApiLines(ln.tenderDenomRows);
    const change = denomRowsToApiLines(ln.changeDenomRows);
    const hasDenom = tender.length > 0 || change.length > 0;

    if (hasDenom) {
      const allowed = ln.allowedDenomValues;
      if (!allowed?.length) {
        return {
          ok: false,
          error:
            "Carga las denominaciones activas de la moneda antes de usar billetes/vuelto (o guarda sin desglose de efectivo).",
        };
      }
      const allowedNums = allowed.filter((v) => Number.isFinite(v));
      for (const row of [...tender, ...change]) {
        const okVal = allowedNums.some((a) => Math.abs(a - row.value) < 1e-6);
        if (!okVal) {
          return {
            ok: false,
            error: `Denominación ${row.value} no válida o inactiva para ${cur.code}.`,
          };
        }
      }
      if (!denominationNetMatchesForeign(tender, change, af)) {
        return {
          ok: false,
          error:
            "Billetes/monedas: la suma entregada menos el vuelto no coincide con el importe neto en moneda extranjera (tolerancia 0,02).",
        };
      }
    }

    const line: CreateSaleOrderPaymentRequest = {
      ...base,
      currencyId: cid,
      amountForeign: round2(af),
      exchangeRateSnapshot: rateLive,
    };
    if (tender.length) line.tenderDenominations = tender;
    if (change.length) line.changeDenominations = change;
    payments.push(line);
  }

  return { ok: true, payments };
}
