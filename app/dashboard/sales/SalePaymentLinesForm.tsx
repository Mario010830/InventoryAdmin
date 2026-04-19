"use client";

import { Fragment, useCallback, useMemo } from "react";
import { theme } from "@/components/dashboard";
import { Icon } from "@/components/ui/Icon";
import { useDisplayCurrency } from "@/contexts/DisplayCurrencyContext";
import { roundPriceDecimals } from "@/lib/displayCurrencyFormat";
import type { CurrencyResponse, PaymentMethodResponse } from "@/lib/dashboard-types";
import { SalePaymentLineForeignBlock } from "./SalePaymentLineForeignBlock";
import {
  amountForeignForTargetCup,
  amountsMatchTotal,
  cupAmountForPaymentLine,
  newPaymentLine,
  parseMoney,
  round2,
  type PaymentLineDraft,
} from "./salePaymentUtils";

export type { PaymentLineDraft };

export function SalePaymentLinesForm({
  methods,
  lines,
  onChange,
  expectedTotal,
  disabled,
  currencies = [],
}: {
  methods: PaymentMethodResponse[];
  lines: PaymentLineDraft[];
  onChange: (next: PaymentLineDraft[]) => void;
  expectedTotal: number;
  disabled?: boolean;
  /** Monedas de la org (GET /currency); para multimoneda y validación de tasa. */
  currencies?: CurrencyResponse[];
}) {
  const { priceDecimals } = useDisplayCurrency();

  const activeMethods = useMemo(
    () => methods.filter((m) => m.isActive !== false),
    [methods],
  );

  const foreignCurrencies = useMemo(
    () => currencies.filter((c) => c.isActive && !c.isBase),
    [currencies],
  );

  const sum = useMemo(() => {
    let s = 0;
    for (const ln of lines) {
      s += cupAmountForPaymentLine(ln, priceDecimals, currencies);
    }
    return round2(s);
  }, [lines, priceDecimals, currencies]);

  const balanced =
    lines.length === 0 || amountsMatchTotal(sum, expectedTotal);

  const firstId = activeMethods[0]?.id ?? 0;

  const addLine = () => {
    if (!firstId) return;
    onChange([...lines, newPaymentLine(firstId)]);
  };

  const fillTotalOnFirst = () => {
    if (!firstId) return;
    const t = round2(expectedTotal);
    if (lines.length === 0) {
      onChange([
        { ...newPaymentLine(firstId), amountStr: t > 0 ? String(t) : "" },
      ]);
      return;
    }
    const [head, ...rest] = lines;
    const headCur =
      head.payCurrencyId != null
        ? currencies.find((c) => c.id === head.payCurrencyId)
        : null;

    if (headCur && !headCur.isBase && t > 0) {
      const af = amountForeignForTargetCup(
        t,
        headCur.exchangeRate,
        priceDecimals,
      );
      onChange([
        {
          ...head,
          paymentMethodId: head.paymentMethodId || firstId,
          amountForeignStr: Number.isFinite(af)
          ? String(Math.round(af * 1e6) / 1e6)
          : "",
          amountStr: "",
          exchangeRateSnapshotStr: String(headCur.exchangeRate),
        },
        ...rest.map((r) => ({
          ...r,
          amountStr: "",
          amountForeignStr: "",
        })),
      ]);
      return;
    }

    onChange([
      {
        ...head,
        paymentMethodId: head.paymentMethodId || firstId,
        amountStr: String(t),
        amountForeignStr: "",
        payCurrencyId: null,
        exchangeRateSnapshotStr: "",
        tenderDenomRows: [],
        changeDenomRows: [],
        allowedDenomValues: undefined,
      },
      ...rest.map((r) => ({
        ...r,
        amountStr: "",
        amountForeignStr: "",
      })),
    ]);
  };

  const patchLine = useCallback(
    (key: string, patch: Partial<PaymentLineDraft>) => {
      onChange(
        lines.map((l) => (l.key === key ? { ...l, ...patch } : l)),
      );
    },
    [lines, onChange],
  );

  return (
    <div className="modal-field field-full">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 8,
        }}
      >
        <label>Pagos (desglose)</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="modal-btn modal-btn--ghost"
            disabled={disabled || !firstId || expectedTotal <= 0}
            onClick={fillTotalOnFirst}
          >
            Llenar total
          </button>
          <button
            type="button"
            className="modal-btn modal-btn--ghost"
            disabled={disabled || !firstId}
            onClick={addLine}
          >
            <Icon name="add" style={{ width: 16, height: 16 }} />
            Añadir método de pago
          </button>
        </div>
      </div>

      {activeMethods.length === 0 ? (
        <p
          style={{
            margin: "0 0 8px",
            fontSize: 13,
            color: theme.secondaryText,
          }}
        >
          No hay métodos de pago activos para esta ubicación. Configúralos en
          el panel o revisa la tienda.
        </p>
      ) : null}

      <p
        style={{
          margin: "0 0 8px",
          fontSize: 13,
          color: balanced ? theme.secondaryText : "#b45309",
        }}
      >
        Suma pagos (CUP): <strong>{sum.toFixed(2)}</strong> — Total orden:{" "}
        <strong>{expectedTotal.toFixed(2)}</strong>
        {!balanced && lines.length > 0
          ? " (debe coincidir con tolerancia 0,01)"
          : null}
      </p>

      {lines.length > 0 ? (
        <div className="sale-create-lines-wrap">
          <table className="sale-create-lines">
            <thead>
              <tr>
                <th>Método</th>
                <th style={{ minWidth: 110 }}>Moneda</th>
                <th style={{ minWidth: 130 }}>Importe pagado</th>
                <th>Referencia op.</th>
                <th style={{ width: 44 }} aria-label="Quitar" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const cur =
                  line.payCurrencyId != null
                    ? foreignCurrencies.find((c) => c.id === line.payCurrencyId)
                    : undefined;
                return (
                  <Fragment key={line.key}>
                    <tr>
                      <td>
                        <select
                          value={line.paymentMethodId || ""}
                          disabled={disabled}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            onChange(
                              lines.map((l) =>
                                l.key === line.key
                                  ? { ...l, paymentMethodId: v }
                                  : l,
                              ),
                            );
                          }}
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            borderRadius: 6,
                            border: `1px solid ${theme.divider}`,
                          }}
                        >
                          {activeMethods.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          value={line.payCurrencyId ?? ""}
                          disabled={disabled}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const id =
                              raw === "" ? null : Number(raw);
                            onChange(
                              lines.map((l) => {
                                if (l.key !== line.key) return l;
                                if (id == null) {
                                  const prevId = l.payCurrencyId;
                                  const prevCur =
                                    prevId != null
                                      ? foreignCurrencies.find(
                                          (c) => c.id === prevId,
                                        )
                                      : null;
                                  const af = parseMoney(l.amountForeignStr);
                                  let amountStr = l.amountStr;
                                  if (
                                    prevCur &&
                                    Number.isFinite(af) &&
                                    af >= 0.01
                                  ) {
                                    amountStr = String(
                                      roundPriceDecimals(
                                        af * prevCur.exchangeRate,
                                        priceDecimals,
                                      ),
                                    );
                                  }
                                  return {
                                    ...l,
                                    payCurrencyId: null,
                                    amountForeignStr: "",
                                    exchangeRateSnapshotStr: "",
                                    tenderDenomRows: [],
                                    changeDenomRows: [],
                                    allowedDenomValues: undefined,
                                    amountStr,
                                  };
                                }
                                const fc = foreignCurrencies.find(
                                  (c) => c.id === id,
                                );
                                if (!fc) {
                                  return {
                                    ...l,
                                    payCurrencyId: id,
                                    exchangeRateSnapshotStr: "",
                                  };
                                }
                                const cup = parseMoney(l.amountStr);
                                const suggestFx =
                                  Number.isFinite(cup) &&
                                  cup > 0 &&
                                  fc.exchangeRate > 0
                                    ? round2(cup / fc.exchangeRate)
                                    : NaN;
                                return {
                                  ...l,
                                  payCurrencyId: id,
                                  exchangeRateSnapshotStr: String(
                                    fc.exchangeRate,
                                  ),
                                  amountForeignStr:
                                    Number.isFinite(suggestFx) && suggestFx > 0
                                      ? String(suggestFx)
                                      : l.amountForeignStr,
                                  amountStr: "",
                                };
                              }),
                            );
                          }}
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            borderRadius: 6,
                            border: `1px solid ${theme.divider}`,
                          }}
                        >
                          <option value="">CUP (base)</option>
                          {foreignCurrencies.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.code}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {line.payCurrencyId != null && cur ? (
                          <div>
                            <input
                              type="text"
                              inputMode="decimal"
                              disabled={disabled}
                              aria-label={`Importe en ${cur.code}`}
                              value={line.amountForeignStr}
                              onChange={(e) => {
                                const v = e.target.value;
                                onChange(
                                  lines.map((l) =>
                                    l.key === line.key
                                      ? { ...l, amountForeignStr: v }
                                      : l,
                                  ),
                                );
                              }}
                              style={{
                                width: "100%",
                                padding: "6px 8px",
                                borderRadius: 6,
                                border: `1px solid ${theme.divider}`,
                              }}
                            />
                            <span
                              style={{
                                display: "block",
                                marginTop: 4,
                                fontSize: 11,
                                color: theme.secondaryText,
                              }}
                            >
                              {(() => {
                                const af = parseMoney(line.amountForeignStr);
                                if (
                                  !Number.isFinite(af) ||
                                  af < 0.01 ||
                                  cur.exchangeRate <= 0
                                ) {
                                  return "— CUP (calculado)";
                                }
                                const cup = roundPriceDecimals(
                                  af * cur.exchangeRate,
                                  priceDecimals,
                                );
                                return `≈ ${cup.toFixed(priceDecimals)} CUP (calculado)`;
                              })()}
                            </span>
                          </div>
                        ) : (
                          <input
                            type="text"
                            inputMode="decimal"
                            disabled={disabled}
                            aria-label="Importe en CUP"
                            value={line.amountStr}
                            onChange={(e) => {
                              const v = e.target.value;
                              onChange(
                                lines.map((l) =>
                                  l.key === line.key
                                    ? { ...l, amountStr: v }
                                    : l,
                                ),
                              );
                            }}
                            style={{
                              width: "100%",
                              padding: "6px 8px",
                              borderRadius: 6,
                              border: `1px solid ${theme.divider}`,
                            }}
                          />
                        )}
                      </td>
                      <td>
                        <input
                          type="text"
                          maxLength={120}
                          disabled={disabled}
                          placeholder="Folio, últimos dígitos…"
                          value={line.reference}
                          onChange={(e) => {
                            const v = e.target.value;
                            onChange(
                              lines.map((l) =>
                                l.key === line.key
                                  ? { ...l, reference: v }
                                  : l,
                              ),
                            );
                          }}
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            borderRadius: 6,
                            border: `1px solid ${theme.divider}`,
                          }}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="sale-create-lines__remove"
                          disabled={disabled}
                          aria-label="Quitar línea de pago"
                          onClick={() =>
                            onChange(lines.filter((l) => l.key !== line.key))
                          }
                        >
                          <Icon name="close" />
                        </button>
                      </td>
                    </tr>
                    {line.payCurrencyId != null && cur ? (
                      <tr className="sale-payment-fx-row">
                        <td colSpan={5} style={{ padding: "4px 0 8px" }}>
                          <SalePaymentLineForeignBlock
                            lineKey={line.key}
                            payCurrencyId={line.payCurrencyId}
                            currency={cur}
                            line={line}
                            disabled={disabled}
                            onPatchLine={patchLine}
                          />
                        </td>
                      </tr>
                    ) : line.payCurrencyId != null && !cur ? (
                      <tr key={`${line.key}-fx-err`}>
                        <td
                          colSpan={5}
                          style={{ color: "#b45309", fontSize: 12 }}
                        >
                          Moneda no disponible o inactiva. Elige otra o «Solo
                          CUP».
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
