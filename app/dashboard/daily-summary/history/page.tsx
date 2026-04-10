"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DatePickerSimple } from "@/components/DatePickerSimple";
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

const STATUS_CONFIG: Record<
  SummaryStatus,
  { badgeClass: string; label: string }
> = {
  Balanced: { badgeClass: "ds-status--balanced", label: "✓ Cuadrado" },
  Surplus:  { badgeClass: "ds-status--surplus",  label: "⚠ Sobrante" },
  Shortage: { badgeClass: "ds-status--shortage", label: "✗ Faltante" },
};

function StatusBadge({ status }: { status: SummaryStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.Balanced;
  return <span className={`ds-status ${cfg.badgeClass}`}>{cfg.label}</span>;
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRows() {
  return (
    <>
      {[1, 2, 3, 4, 5].map((i) => (
        <tr key={i}>
          {[1, 2, 3, 4, 5, 6, 7].map((j) => (
            <td key={j}>
              <div
                className="ds-skeleton"
                style={{ height: 18, width: j === 1 ? 90 : 70 }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DailySummaryHistoryPage() {
  const router = useRouter();

  const [from, setFrom] = useState(daysAgoIso(30));
  const [to, setTo] = useState(todayIso());
  const [appliedFrom, setAppliedFrom] = useState(daysAgoIso(30));
  const [appliedTo, setAppliedTo] = useState(todayIso());

  const { data: history = [], isLoading, isFetching } = useGetDailySummaryHistoryQuery(
    { from: appliedFrom, to: appliedTo },
    { skip: !appliedFrom || !appliedTo },
  );

  const handleSearch = () => {
    setAppliedFrom(from);
    setAppliedTo(to);
  };

  const handleViewDetail = (date: string) => {
    router.push(`/dashboard/daily-summary?date=${encodeURIComponent(date)}`);
  };

  const isBusy = isLoading || isFetching;

  return (
    <div className="ds-page">
      {/* ── ENCABEZADO ── */}
      <div className="ds-header">
        <div className="ds-header__title-row">
          <div className="ds-header__icon">
            <Icon name="history" />
          </div>
          <h1 className="ds-header__title">Historial de Cuadres</h1>
        </div>
        <button
          type="button"
          className="ds-btn ds-btn--outline"
          onClick={() => router.push("/dashboard/daily-summary")}
        >
          <Icon name="arrow_back" />
          Cuadre del día
        </button>
      </div>

      {/* ── FILTROS ── */}
      <div className="ds-history-filters">
        <div className="ds-history-filter-field">
          <span className="ds-history-filter-label">Desde</span>
          <DatePickerSimple
            date={from}
            setDate={setFrom}
            emptyLabel="Fecha inicial"
          />
        </div>
        <div className="ds-history-filter-field">
          <span className="ds-history-filter-label">Hasta</span>
          <DatePickerSimple
            date={to}
            setDate={setTo}
            emptyLabel="Fecha final"
          />
        </div>
        <button
          type="button"
          className="ds-btn ds-btn--primary"
          onClick={handleSearch}
          disabled={isBusy || !from || !to}
        >
          {isBusy ? (
            <span className="ds-spinner" />
          ) : (
            <Icon name="search" />
          )}
          Buscar
        </button>
      </div>

      {/* ── TABLA ── */}
      <div className="ds-section">
        <div className="ds-section__header">
          <Icon name="table_rows" />
          <h2 className="ds-section__title">
            {history.length > 0
              ? `${history.length} cuadre${history.length !== 1 ? "s" : ""} encontrado${history.length !== 1 ? "s" : ""}`
              : "Resultados"}
          </h2>
        </div>

        {!isBusy && history.length === 0 ? (
          <div className="ds-empty">
            <span className="ds-empty__icon">
              <Icon name="search_off" />
            </span>
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
                  <th>Ventas</th>
                  <th>Caja esperada</th>
                  <th>Contado</th>
                  <th>Diferencia</th>
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
                      <td className="ds-table td--number">
                        {formatCup(row.totalSales)}
                      </td>
                      <td className="ds-table td--number">
                        {formatCup(row.expectedCash)}
                      </td>
                      <td className="ds-table td--number">
                        {formatCup(row.actualCash)}
                      </td>
                      <td className="ds-table td--number">
                        <span
                          className={
                            row.status !== "Balanced"
                              ? "ds-table__diff--nonzero"
                              : ""
                          }
                        >
                          {formatCup(row.difference)}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={row.status} />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="ds-btn ds-btn--ghost"
                          onClick={() => handleViewDetail(row.date)}
                          title="Ver detalle"
                        >
                          <Icon name="open_in_new" />
                          Ver detalle
                        </button>
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
