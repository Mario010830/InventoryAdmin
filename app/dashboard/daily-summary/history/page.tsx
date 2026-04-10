"use client";

import Link from "next/link";
import { useState } from "react";
import { DatePickerSimple } from "@/components/DatePickerSimple";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { formatDisplayCurrency } from "@/lib/formatCurrency";
import type { DailySummary } from "@/lib/types/daily-summary";
import { useGetDailySummaryHistoryQuery } from "../_service/dailySummaryApi";
import "../daily-summary.css";

// ─── helpers ──────────────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().split("T")[0] ?? "";
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0] ?? "";
}

function formatCup(value: number): string {
  return formatDisplayCurrency(value, "es-ES", {
    minFractionDigits: 2,
    maxFractionDigits: 2,
  });
}

function formatDate(iso: string): string {
  try {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

type SummaryStatus = DailySummary["status"];

const STATUS_CFG: Record<SummaryStatus, { cls: string; label: string }> = {
  Balanced: { cls: "ds-status-badge--balanced", label: "✓ Cuadrado" },
  Surplus:  { cls: "ds-status-badge--surplus",  label: "⚠ Sobrante" },
  Shortage: { cls: "ds-status-badge--shortage", label: "✗ Faltante" },
};

function StatusBadge({ status }: { status: SummaryStatus }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.Balanced;
  return <span className={`ds-status-badge ${cfg.cls}`}>{cfg.label}</span>;
}

// ─── Skeleton rows ────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <tr key={i}>
          {[100, 90, 90, 90, 90, 80, 70].map((w, j) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: índices estáticos de skeleton
            <td key={j}>
              <div className="ds-skeleton" style={{ height: 16, width: w }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DailySummaryHistoryPage() {
  const [from, setFrom] = useState(daysAgoIso(30));
  const [to, setTo] = useState(todayIso());
  const [appliedFrom, setAppliedFrom] = useState(daysAgoIso(30));
  const [appliedTo, setAppliedTo] = useState(todayIso());

  const { data: history = [], isLoading, isFetching } =
    useGetDailySummaryHistoryQuery(
      { from: appliedFrom, to: appliedTo },
      { skip: !appliedFrom || !appliedTo },
    );

  const isBusy = isLoading || isFetching;

  const handleSearch = () => {
    setAppliedFrom(from);
    setAppliedTo(to);
  };

  return (
    <div className="dashboard-page">
      {/* ── Encabezado ── */}
      <header className="dashboard-report-layout__head" style={{ flexWrap: "wrap", gap: 12 }}>
        <div className="dashboard-report-layout__title">
          <h1>Historial de Cuadres</h1>
          <p>Consulta los cierres de caja de cualquier período</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/daily-summary">
            <Icon name="arrow_back" />
            Cuadre del día
          </Link>
        </Button>
      </header>

      {/* ── Filtros ── */}
      <div className="ds-filter-bar">
        <div className="ds-filter-field">
          <span className="ds-filter-label">Desde</span>
          <DatePickerSimple date={from} setDate={setFrom} emptyLabel="Fecha inicial" />
        </div>
        <div className="ds-filter-field">
          <span className="ds-filter-label">Hasta</span>
          <DatePickerSimple date={to} setDate={setTo} emptyLabel="Fecha final" />
        </div>
        <Button
          onClick={handleSearch}
          disabled={isBusy || !from || !to}
        >
          {isBusy ? (
            <span
              className="dt-state__spinner"
              style={{ width: 14, height: 14, borderWidth: 2, borderColor: "rgba(255,255,255,.35)", borderTopColor: "#fff" }}
            />
          ) : (
            <Icon name="search" />
          )}
          Buscar
        </Button>
      </div>

      {/* ── Tabla ── */}
      <div className="ds-table-section">
        <div className="ds-table-section__header">
          <Icon name="table_rows" />
          <h2 className="ds-table-section__title">
            {!isBusy && history.length > 0
              ? `${history.length} cuadre${history.length !== 1 ? "s" : ""}`
              : "Resultados"}
          </h2>
        </div>

        {!isBusy && history.length === 0 ? (
          <div className="ds-empty">
            <Icon name="search_off" />
            <h3 className="ds-empty__title">Sin resultados</h3>
            <p className="ds-empty__desc">
              No hay cuadres en el rango de fechas seleccionado.
            </p>
          </div>
        ) : (
          <div className="ds-table-wrapper">
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th className="td-num">Ventas</th>
                  <th className="td-num">Caja esperada</th>
                  <th className="td-num">Contado</th>
                  <th className="td-num">Diferencia</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isBusy ? (
                  <SkeletonRows />
                ) : (
                  history.map((row) => (
                    <tr key={row.id}>
                      <td>{formatDate(row.date)}</td>
                      <td className="td-num">{formatCup(row.totalSales)}</td>
                      <td className="td-num">{formatCup(row.expectedCash)}</td>
                      <td className="td-num">{formatCup(row.actualCash)}</td>
                      <td className="td-num">
                        <span className={row.status !== "Balanced" ? "td-diff-warn" : ""}>
                          {formatCup(row.difference)}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={row.status} />
                      </td>
                      <td>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/daily-summary?date=${encodeURIComponent(row.date)}`}>
                            <Icon name="open_in_new" />
                            Ver detalle
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
