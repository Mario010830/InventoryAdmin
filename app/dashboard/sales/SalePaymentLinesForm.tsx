"use client";

import { useMemo } from "react";
import { theme } from "@/components/dashboard";
import { Icon } from "@/components/ui/Icon";
import type { PaymentMethodResponse } from "@/lib/dashboard-types";
import {
  amountsMatchTotal,
  newPaymentLine,
  newPaymentLineKey,
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
}: {
  methods: PaymentMethodResponse[];
  lines: PaymentLineDraft[];
  onChange: (next: PaymentLineDraft[]) => void;
  expectedTotal: number;
  disabled?: boolean;
}) {
  const activeMethods = useMemo(
    () => methods.filter((m) => m.isActive !== false),
    [methods],
  );

  const sum = useMemo(() => {
    let s = 0;
    for (const ln of lines) {
      const a = parseMoney(ln.amountStr);
      if (Number.isFinite(a) && a > 0) s += a;
    }
    return round2(s);
  }, [lines]);

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
    onChange([
      { ...head, paymentMethodId: head.paymentMethodId || firstId, amountStr: String(t) },
      ...rest.map((r) => ({ ...r, amountStr: "" })),
    ]);
  };

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
            Línea
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
        Suma pagos: <strong>{sum.toFixed(2)}</strong> — Total orden:{" "}
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
                <th style={{ width: 120 }}>Importe</th>
                <th>Referencia op.</th>
                <th style={{ width: 44 }} aria-label="Quitar" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.key}>
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
                    <input
                      type="text"
                      inputMode="decimal"
                      disabled={disabled}
                      aria-label="Importe"
                      value={line.amountStr}
                      onChange={(e) => {
                        const v = e.target.value;
                        onChange(
                          lines.map((l) =>
                            l.key === line.key ? { ...l, amountStr: v } : l,
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
                            l.key === line.key ? { ...l, reference: v } : l,
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
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
