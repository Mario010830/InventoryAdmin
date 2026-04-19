"use client";

import { useEffect, useMemo, useRef } from "react";
import { useGetDenominationsQuery } from "@/app/dashboard/settings/_service/currencyApi";
import { theme } from "@/components/dashboard";
import type { CurrencyResponse } from "@/lib/dashboard-types";
import {
  denominationNetMatchesForeign,
  mergeDenomRows,
  parseMoney,
  type DenomQtyRow,
  type PaymentLineDraft,
} from "./salePaymentUtils";

type Props = {
  lineKey: string;
  payCurrencyId: number;
  currency: CurrencyResponse;
  line: PaymentLineDraft;
  disabled?: boolean;
  onPatchLine: (key: string, patch: Partial<PaymentLineDraft>) => void;
};

function denomLinesFromRows(
  rows: readonly DenomQtyRow[],
): { value: number; quantity: number }[] {
  return rows
    .map((r) => {
      const q = parseInt(String(r.quantityStr).trim(), 10);
      return { value: r.value, quantity: Number.isFinite(q) ? q : 0 };
    })
    .filter((x) => x.quantity > 0);
}

/** Billetes/vuelto opcional; el importe en moneda lo escribe el usuario en la fila principal. */
export function SalePaymentLineForeignBlock({
  lineKey,
  payCurrencyId,
  currency,
  line,
  disabled,
  onPatchLine,
}: Props) {
  const { data, isFetching, isSuccess } = useGetDenominationsQuery(
    { currencyId: payCurrencyId, activeOnly: true },
    { skip: !payCurrencyId },
  );
  const denominations = data ?? [];

  const catalogValues = useMemo(() => {
    return [...denominations]
      .sort(
        (a, b) =>
          a.sortOrder - b.sortOrder ||
          (b.value as number) - (a.value as number),
      )
      .map((d) => d.value);
  }, [denominations]);

  const catalogKey = catalogValues.join(",");

  const lineRef = useRef(line);
  lineRef.current = line;

  useEffect(() => {
    if (!payCurrencyId) return;
    if (isFetching && denominations.length === 0) return;

    if (denominations.length === 0) {
      if (isSuccess) {
        onPatchLine(lineKey, {
          allowedDenomValues: [],
          tenderDenomRows: [],
          changeDenomRows: [],
        });
      }
      return;
    }

    const cur = lineRef.current;
    const tender = mergeDenomRows(cur.tenderDenomRows, catalogValues);
    const change = mergeDenomRows(cur.changeDenomRows, catalogValues);
    onPatchLine(lineKey, {
      allowedDenomValues: catalogValues,
      tenderDenomRows: tender,
      changeDenomRows: change,
    });
  }, [
    payCurrencyId,
    catalogKey,
    lineKey,
    onPatchLine,
    catalogValues,
    denominations.length,
    isFetching,
    isSuccess,
  ]);

  const rate = currency.exchangeRate;
  const amountForeign = parseMoney(line.amountForeignStr);
  const tenderLines = denomLinesFromRows(line.tenderDenomRows);
  const changeLines = denomLinesFromRows(line.changeDenomRows);
  const netOk =
    !tenderLines.length && !changeLines.length
      ? true
      : Number.isFinite(amountForeign) &&
        denominationNetMatchesForeign(tenderLines, changeLines, amountForeign);

  const updateDenomQty = (
    side: "tender" | "change",
    value: number,
    quantityStr: string,
  ) => {
    const field = side === "tender" ? "tenderDenomRows" : "changeDenomRows";
    const rows = line[field];
    onPatchLine(lineKey, {
      [field]: rows.map((r) =>
        r.value === value ? { ...r, quantityStr: quantityStr } : r,
      ),
    });
  };

  return (
    <div
      style={{
        marginTop: 8,
        padding: 10,
        borderRadius: 8,
        background: theme.surface,
        border: `1px solid ${theme.divider}`,
        fontSize: 12,
      }}
    >
      <div style={{ marginBottom: 6, color: theme.secondaryText }}>
        Tasa aplicada al enviar (CUP por 1 {currency.code}):{" "}
        <strong>{rate}</strong>
        {isFetching ? " · cargando denominaciones…" : null}
      </div>

      {catalogValues.length > 0 ? (
        <>
          <p style={{ margin: "0 0 6px", color: theme.secondaryText }}>
            Opcional: billetes y monedas (entregado / vuelto). Debe cuadrar con
            el importe pagado en {currency.code}.
          </p>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12,
              }}
            >
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "4px 6px" }}>
                    Valor
                  </th>
                  <th style={{ textAlign: "left", padding: "4px 6px" }}>
                    Entregado
                  </th>
                  <th style={{ textAlign: "left", padding: "4px 6px" }}>
                    Vuelto
                  </th>
                </tr>
              </thead>
              <tbody>
                {catalogValues.map((v) => (
                  <tr key={v}>
                    <td style={{ padding: "4px 6px" }}>{v}</td>
                    <td style={{ padding: "4px 6px" }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        disabled={disabled}
                        aria-label={`Entregado ${v}`}
                        value={
                          line.tenderDenomRows.find((r) => r.value === v)
                            ?.quantityStr ?? ""
                        }
                        onChange={(e) =>
                          updateDenomQty("tender", v, e.target.value)
                        }
                        style={{
                          width: 72,
                          padding: "4px 6px",
                          borderRadius: 4,
                          border: `1px solid ${theme.divider}`,
                        }}
                      />
                    </td>
                    <td style={{ padding: "4px 6px" }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        disabled={disabled}
                        aria-label={`Vuelto ${v}`}
                        value={
                          line.changeDenomRows.find((r) => r.value === v)
                            ?.quantityStr ?? ""
                        }
                        onChange={(e) =>
                          updateDenomQty("change", v, e.target.value)
                        }
                        style={{
                          width: 72,
                          padding: "4px 6px",
                          borderRadius: 4,
                          border: `1px solid ${theme.divider}`,
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!netOk && (tenderLines.length > 0 || changeLines.length > 0) ? (
            <p style={{ margin: "6px 0 0", color: "#b45309" }}>
              La suma entregada − vuelto no coincide con el importe en{" "}
              {currency.code} (tolerancia 0,02).
            </p>
          ) : null}
        </>
      ) : !isFetching ? (
        <p style={{ margin: 0, color: "#64748b" }}>
          Sin denominaciones activas para {currency.code}. Puedes cobrar solo
          con importe en moneda; el desglose en efectivo es opcional.
        </p>
      ) : null}
    </div>
  );
}
