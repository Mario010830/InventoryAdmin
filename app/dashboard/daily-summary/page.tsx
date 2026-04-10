"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DatePickerSimple } from "@/components/DatePickerSimple";
import { FormModal } from "@/components/FormModal";
import { ReportKpiCard } from "@/components/reportes/ReportKpiCard";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { formatDisplayCurrency } from "@/lib/formatCurrency";
import type {
  DailySummary,
  DailySummaryInventoryItem,
  GenerateDailySummaryRequest,
} from "@/lib/types/daily-summary";
import { useUserPermissionCodes } from "@/lib/useUserPermissionCodes";
import { useAppSelector } from "@/store/store";
import { useGetLocationsQuery } from "../locations/_service/locationsApi";
import {
  exportDailySummaryCsv,
  exportDailySummaryPdf,
  useGenerateDailySummaryMutation,
  useGetDailySummaryByDateQuery,
} from "./_service/dailySummaryApi";
import "./daily-summary.css";

// ─── helpers ──────────────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().split("T")[0] ?? "";
}

function formatCup(value: number): string {
  return formatDisplayCurrency(value, "es-ES", {
    minFractionDigits: 2,
    maxFractionDigits: 2,
  });
}

type SummaryStatus = DailySummary["status"];

const STATUS_CFG: Record<
  SummaryStatus,
  { valueClass: string; badgeClass: string; label: string }
> = {
  Balanced: {
    valueClass: "ds-kpi-value--balanced",
    badgeClass: "ds-kpi-badge--balanced",
    label: "✓ Cuadrado",
  },
  Surplus: {
    valueClass: "ds-kpi-value--surplus",
    badgeClass: "ds-kpi-badge--surplus",
    label: "⚠ Sobrante",
  },
  Shortage: {
    valueClass: "ds-kpi-value--shortage",
    badgeClass: "ds-kpi-badge--shortage",
    label: "✗ Faltante",
  },
};

// ─── Tabla de inventario ──────────────────────────────────────────────────────

function InventoryTable({ items }: { items: DailySummaryInventoryItem[] }) {
  return (
    <div className="ds-table-section">
      <div className="ds-table-section__header">
        <Icon name="inventory" />
        <h2 className="ds-table-section__title">Inventario Consumido</h2>
      </div>
      <div className="ds-table-wrapper">
        <table className="ds-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th className="td-num">Vendido</th>
              <th className="td-num">Stock anterior</th>
              <th className="td-num">Stock actual</th>
              <th className="td-num">Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.productId}>
                <td>{item.productName}</td>
                <td className="td-num">{item.quantitySold}</td>
                <td className="td-num">{item.stockBefore}</td>
                <td className="td-num">{item.stockAfter}</td>
                <td className="td-num">
                  <span className={item.stockDifference !== 0 ? "td-diff-warn" : ""}>
                    {item.stockDifference}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Modal Generar Cuadre ─────────────────────────────────────────────────────

function GenerateModal({
  open,
  onClose,
  defaultDate,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  defaultDate: string;
  onSuccess: () => void;
}) {
  const user = useAppSelector((s) => s.auth);
  const isEmployee = (user?.locationId ?? 0) > 0;
  const today = todayIso();

  const [date, setDate] = useState(defaultDate);
  const [locationId, setLocationId] = useState("");
  const [openingCash, setOpeningCash] = useState("");
  const [actualCash, setActualCash] = useState("");
  const [notes, setNotes] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const { data: locationsResult } = useGetLocationsQuery(
    { page: 1, perPage: 200 },
    { skip: isEmployee || !open },
  );
  const locations = locationsResult?.data ?? [];

  const [generateMutation, { isLoading: isGenerating }] =
    useGenerateDailySummaryMutation();

  // Reset al abrir
  useEffect(() => {
    if (!open) return;
    setDate(defaultDate);
    setLocationId("");
    setOpeningCash("");
    setActualCash("");
    setNotes("");
    setFieldError(null);
  }, [open, defaultDate]);

  const validate = (): string | null => {
    if (!date) return "Selecciona una fecha.";
    if (date > today) return "La fecha no puede ser futura.";
    if (!isEmployee && !locationId) return "Selecciona la ubicación.";
    const op = parseFloat(openingCash.replace(",", "."));
    if (Number.isNaN(op) || op < 0) return "El fondo inicial debe ser ≥ 0.";
    const ac = parseFloat(actualCash.replace(",", "."));
    if (Number.isNaN(ac) || ac < 0) return "El dinero contado debe ser ≥ 0.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setFieldError(err); return; }
    setFieldError(null);

    const payload: GenerateDailySummaryRequest = {
      date,
      openingCash: parseFloat(openingCash.replace(",", ".")),
      actualCash: parseFloat(actualCash.replace(",", ".")),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...(!isEmployee && locationId ? { locationId: Number(locationId) } : {}),
    };

    try {
      await generateMutation(payload).unwrap();
      onSuccess();
      onClose();
    } catch (err) {
      const msg =
        (err as { data?: { message?: string } })?.data?.message ??
        "Error al generar el cuadre.";
      setFieldError(msg);
    }
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Generar Cuadre Diario"
      icon="calculate"
      onSubmit={(e) => void handleSubmit(e)}
      submitting={isGenerating}
      submitLabel="Generar"
      error={fieldError ?? undefined}
      maxWidth="480px"
    >
      {/* Fecha */}
      <div className="modal-field field-full">
        <label htmlFor="ds-date">Fecha</label>
        <DatePickerSimple
          date={date}
          setDate={setDate}
          emptyLabel="Seleccionar fecha"
        />
      </div>

      {/* Ubicación — solo visible para admins */}
      {!isEmployee && (
        <div className="modal-field field-full">
          <label htmlFor="ds-location">
            Ubicación <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <select
            id="ds-location"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            required
          >
            <option value="">Seleccionar ubicación…</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Fondo inicial */}
      <div className="modal-field">
        <label htmlFor="ds-opening">
          Fondo inicial (CUP) <span style={{ color: "#dc2626" }}>*</span>
        </label>
        <input
          id="ds-opening"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={openingCash}
          onChange={(e) => setOpeningCash(e.target.value)}
          required
        />
      </div>

      {/* Dinero contado */}
      <div className="modal-field">
        <label htmlFor="ds-actual">
          Dinero contado (CUP) <span style={{ color: "#dc2626" }}>*</span>
        </label>
        <input
          id="ds-actual"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={actualCash}
          onChange={(e) => setActualCash(e.target.value)}
          required
        />
      </div>

      {/* Notas */}
      <div className="modal-field field-full">
        <label htmlFor="ds-notes">Notas (opcional)</label>
        <textarea
          id="ds-notes"
          placeholder="Observaciones del cierre…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>
    </FormModal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DailySummaryPage() {
  const searchParams = useSearchParams();
  const paramDate = searchParams.get("date");

  const [selectedDate, setSelectedDate] = useState(paramDate ?? todayIso());
  const [modalOpen, setModalOpen] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  useEffect(() => {
    if (paramDate) setSelectedDate(paramDate);
  }, [paramDate]);

  const { has: hasPermission } = useUserPermissionCodes();
  const canCreate = hasPermission("daily_summary.create");
  const canExport = hasPermission("daily_summary.export");

  const { data: summary, isLoading, refetch } = useGetDailySummaryByDateQuery(
    selectedDate,
    { skip: !selectedDate },
  );

  const hasSummary = !!summary;

  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    try {
      await exportDailySummaryCsv(selectedDate);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al exportar CSV", {
        duration: 5000,
      });
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      await exportDailySummaryPdf(selectedDate);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al exportar PDF", {
        duration: 5000,
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="dashboard-page">
      {/* ── Encabezado ── */}
      <header className="dashboard-report-layout__head" style={{ flexWrap: "wrap", gap: 12 }}>
        <div className="dashboard-report-layout__title">
          <h1>Cuadre Diario</h1>
          <p>Cierre de caja y verificación de inventario consumido</p>
        </div>

        <div className="ds-page-controls">
          <DatePickerSimple
            date={selectedDate}
            setDate={setSelectedDate}
            emptyLabel="Seleccionar fecha"
          />

          {canCreate && (
            <Button onClick={() => setModalOpen(true)}>
              <Icon name="add_circle" />
              Generar Cuadre
            </Button>
          )}

          {canExport && (
            <>
              <Button
                variant="outline"
                disabled={!hasSummary || isExportingCsv || isExportingPdf}
                onClick={() => void handleExportCsv()}
                title={!hasSummary ? "Genera un cuadre primero" : undefined}
              >
                {isExportingCsv ? (
                  <span className="dt-state__spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                ) : (
                  <Icon name="download" />
                )}
                CSV
              </Button>
              <Button
                variant="outline"
                disabled={!hasSummary || isExportingCsv || isExportingPdf}
                onClick={() => void handleExportPdf()}
                title={!hasSummary ? "Genera un cuadre primero" : undefined}
              >
                {isExportingPdf ? (
                  <span className="dt-state__spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                ) : (
                  <Icon name="picture_as_pdf" />
                )}
                PDF
              </Button>
            </>
          )}
        </div>
      </header>

      {/* ── Tarjetas KPI ── */}
      {isLoading ? (
        <div className="ds-kpi-grid">
          {[1, 2, 3, 4].map((i) => (
            <ReportKpiCard key={i} label="" value="" loading />
          ))}
        </div>
      ) : summary ? (
        <div className="ds-kpi-grid">
          <ReportKpiCard
            label="Ventas del día"
            value={formatCup(summary.totalSales)}
            subvalue={`${formatCup(summary.totalReturns)} en devoluciones`}
          />
          <ReportKpiCard
            label="Caja esperada"
            value={formatCup(summary.expectedCash)}
            subvalue={`Fondo inicial: ${formatCup(summary.openingCash)}`}
          />
          <ReportKpiCard
            label="Dinero contado"
            value={formatCup(summary.actualCash)}
          />
          {/* Tarjeta diferencia con color dinámico */}
          <div className="dashboard-card dashboard-card--stat flex min-h-[112px] min-w-[160px] flex-1 flex-col p-5">
            <div className="mb-2 flex items-start justify-between gap-2">
              <span className="text-[0.7rem] font-bold uppercase tracking-wide text-slate-500">
                Diferencia
              </span>
            </div>
            <span
              className={`text-2xl font-bold tabular-nums ${STATUS_CFG[summary.status].valueClass}`}
            >
              {formatCup(summary.difference)}
            </span>
            <span className={`ds-kpi-badge ${STATUS_CFG[summary.status].badgeClass}`}>
              {STATUS_CFG[summary.status].label}
            </span>
          </div>
        </div>
      ) : (
        <div className="dashboard-card ds-empty">
          <Icon name="calculate" />
          <h2 className="ds-empty__title">Sin cuadre para esta fecha</h2>
          <p className="ds-empty__desc">
            {canCreate
              ? 'Selecciona la fecha y pulsa "Generar Cuadre" para crear el cierre de caja.'
              : "No se encontró un cuadre diario para la fecha seleccionada."}
          </p>
        </div>
      )}

      {/* ── Tabla de inventario consumido ── */}
      {summary && summary.inventoryItems.length > 0 && (
        <InventoryTable items={summary.inventoryItems} />
      )}

      {/* ── Modal ── */}
      <GenerateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultDate={selectedDate}
        onSuccess={() => void refetch()}
      />
    </div>
  );
}
