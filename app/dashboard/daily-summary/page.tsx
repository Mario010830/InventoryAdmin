"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DatePickerSimple } from "@/components/DatePickerSimple";
import { FormModal } from "@/components/FormModal";
import { Icon } from "@/components/ui/Icon";
import { formatDisplayCurrency } from "@/lib/formatCurrency";
import type {
  DailySummary,
  DailySummaryInventoryItem,
  GenerateDailySummaryRequest,
} from "@/lib/types/daily-summary";
import { useUserPermissionCodes } from "@/lib/useUserPermissionCodes";
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
  return `${formatDisplayCurrency(value, "es-ES", { minFractionDigits: 2, maxFractionDigits: 2 })}`;
}

type SummaryStatus = DailySummary["status"];

const STATUS_CONFIG: Record<
  SummaryStatus,
  { valueClass: string; badgeClass: string; label: string; icon: string }
> = {
  Balanced: {
    valueClass: "ds-card__value--balanced",
    badgeClass: "ds-badge--balanced",
    label: "✓ Cuadrado",
    icon: "check_circle",
  },
  Surplus: {
    valueClass: "ds-card__value--surplus",
    badgeClass: "ds-badge--surplus",
    label: "⚠ Sobrante",
    icon: "warning",
  },
  Shortage: {
    valueClass: "ds-card__value--shortage",
    badgeClass: "ds-badge--shortage",
    label: "✗ Faltante",
    icon: "error",
  },
};

// ─── Subcomponents ────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  status,
}: {
  label: string;
  value: string;
  sub?: string;
  status?: SummaryStatus;
}) {
  const cfg = status ? STATUS_CONFIG[status] : null;
  return (
    <div className="ds-card">
      <span className="ds-card__label">{label}</span>
      <span className={`ds-card__value ${cfg ? cfg.valueClass : ""}`}>
        {value}
      </span>
      {sub && <span className="ds-card__sub">{sub}</span>}
      {cfg && (
        <span className={`ds-card__badge ${cfg.badgeClass}`}>
          <Icon name={cfg.icon} />
          {cfg.label}
        </span>
      )}
    </div>
  );
}

function SkeletonCards() {
  return (
    <div className="ds-skeleton-cards">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="ds-skeleton ds-skeleton-card" />
      ))}
    </div>
  );
}

function InventoryTable({
  items,
}: {
  items: DailySummaryInventoryItem[];
}) {
  return (
    <div className="ds-section">
      <div className="ds-section__header">
        <Icon name="inventory" />
        <h2 className="ds-section__title">Inventario Consumido</h2>
      </div>
      <div className="ds-table-wrapper">
        <table className="ds-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Vendido</th>
              <th>Stock Anterior</th>
              <th>Stock Actual</th>
              <th>Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.productId}>
                <td>{item.productName}</td>
                <td className="ds-table td--number">{item.quantitySold}</td>
                <td className="ds-table td--number">{item.stockBefore}</td>
                <td className="ds-table td--number">{item.stockAfter}</td>
                <td className="ds-table td--number">
                  <span
                    className={
                      item.stockDifference !== 0
                        ? "ds-table__diff--nonzero"
                        : ""
                    }
                  >
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

// ─── Generate Modal ────────────────────────────────────────────────────────────

interface GenerateModalProps {
  open: boolean;
  onClose: () => void;
  defaultDate: string;
  onSuccess: () => void;
}

function GenerateModal({
  open,
  onClose,
  defaultDate,
  onSuccess,
}: GenerateModalProps) {
  const [date, setDate] = useState(defaultDate);
  const [openingCash, setOpeningCash] = useState("");
  const [actualCash, setActualCash] = useState("");
  const [notes, setNotes] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const [generateMutation, { isLoading: isGenerating }] =
    useGenerateDailySummaryMutation();

  const today = todayIso();

  const validate = (): string | null => {
    if (!date) return "Selecciona una fecha.";
    if (date > today) return "La fecha no puede ser futura.";
    const opening = parseFloat(openingCash.replace(",", "."));
    if (Number.isNaN(opening) || opening < 0)
      return "El fondo inicial debe ser un número ≥ 0.";
    const actual = parseFloat(actualCash.replace(",", "."));
    if (Number.isNaN(actual) || actual < 0)
      return "El dinero contado debe ser un número ≥ 0.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setFieldError(err);
      return;
    }
    setFieldError(null);
    const payload: GenerateDailySummaryRequest = {
      date,
      openingCash: parseFloat(openingCash.replace(",", ".")),
      actualCash: parseFloat(actualCash.replace(",", ".")),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
    try {
      await generateMutation(payload).unwrap();
      onSuccess();
      onClose();
      setOpeningCash("");
      setActualCash("");
      setNotes("");
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
      <div className="ds-form-field">
        <label className="ds-form-label">
          Fecha
        </label>
        <DatePickerSimple
          date={date}
          setDate={setDate}
          emptyLabel="Seleccionar fecha"
        />
      </div>

      <div className="ds-form-field">
        <label className="ds-form-label" htmlFor="ds-opening-cash">
          Fondo inicial en caja (CUP) <span>*</span>
        </label>
        <input
          id="ds-opening-cash"
          type="text"
          inputMode="decimal"
          className="ds-form-input"
          placeholder="0.00"
          value={openingCash}
          onChange={(e) => setOpeningCash(e.target.value)}
          required
        />
      </div>

      <div className="ds-form-field">
        <label className="ds-form-label" htmlFor="ds-actual-cash">
          Dinero físico contado (CUP) <span>*</span>
        </label>
        <input
          id="ds-actual-cash"
          type="text"
          inputMode="decimal"
          className="ds-form-input"
          placeholder="0.00"
          value={actualCash}
          onChange={(e) => setActualCash(e.target.value)}
          required
        />
      </div>

      <div className="ds-form-field">
        <label className="ds-form-label" htmlFor="ds-notes">
          Notas (opcional)
        </label>
        <textarea
          id="ds-notes"
          className="ds-form-textarea"
          placeholder="Observaciones del cierre de caja…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
    </FormModal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DailySummaryPage() {
  const searchParams = useSearchParams();
  const paramDate = searchParams.get("date");
  const [selectedDate, setSelectedDate] = useState(
    paramDate ?? todayIso(),
  );

  useEffect(() => {
    if (paramDate) setSelectedDate(paramDate);
  }, [paramDate]);
  const [modalOpen, setModalOpen] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const { has: hasPermission } = useUserPermissionCodes();
  const canCreate = hasPermission("daily_summary.create");
  const canExport = hasPermission("daily_summary.export");

  const {
    data: summary,
    isLoading,
    refetch,
  } = useGetDailySummaryByDateQuery(selectedDate, { skip: !selectedDate });

  const hasSummary = !!summary;

  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    try {
      await exportDailySummaryCsv(selectedDate);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al exportar CSV";
      toast.error(msg, { duration: 5000 });
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      await exportDailySummaryPdf(selectedDate);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al exportar PDF";
      toast.error(msg, { duration: 5000 });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const isExporting = isExportingCsv || isExportingPdf;

  return (
    <div className="ds-page">
      {/* ── ENCABEZADO ── */}
      <div className="ds-header">
        <div className="ds-header__title-row">
          <div className="ds-header__icon">
            <Icon name="calculate" />
          </div>
          <h1 className="ds-header__title">Cuadre Diario</h1>
        </div>

        <div className="ds-datepicker-row">
          <span className="ds-datepicker-label">Fecha</span>
          <DatePickerSimple
            date={selectedDate}
            setDate={setSelectedDate}
            emptyLabel="Seleccionar fecha"
          />
        </div>

        <div className="ds-header__actions">
          {canCreate && (
            <button
              type="button"
              className="ds-btn ds-btn--primary"
              onClick={() => setModalOpen(true)}
            >
              <Icon name="add_circle" />
              Generar Cuadre
            </button>
          )}

          {canExport && (
            <>
              <button
                type="button"
                className="ds-btn ds-btn--outline"
                disabled={!hasSummary || isExporting}
                onClick={() => void handleExportCsv()}
                title={!hasSummary ? "Genera un cuadre primero" : undefined}
              >
                {isExportingCsv ? (
                  <span className="ds-spinner ds-spinner--dark" />
                ) : (
                  <Icon name="download" />
                )}
                CSV
              </button>
              <button
                type="button"
                className="ds-btn ds-btn--outline"
                disabled={!hasSummary || isExporting}
                onClick={() => void handleExportPdf()}
                title={!hasSummary ? "Genera un cuadre primero" : undefined}
              >
                {isExportingPdf ? (
                  <span className="ds-spinner ds-spinner--dark" />
                ) : (
                  <Icon name="picture_as_pdf" />
                )}
                PDF
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── TARJETAS DE RESUMEN ── */}
      {isLoading ? (
        <SkeletonCards />
      ) : summary ? (
        <div className="ds-cards">
          <KpiCard
            label="Ventas del día"
            value={formatCup(summary.totalSales)}
            sub={`${formatCup(summary.totalReturns)} en devoluciones`}
          />
          <KpiCard
            label="Caja esperada"
            value={formatCup(summary.expectedCash)}
            sub={`Fondo inicial: ${formatCup(summary.openingCash)}`}
          />
          <KpiCard
            label="Dinero contado"
            value={formatCup(summary.actualCash)}
          />
          <KpiCard
            label="Diferencia"
            value={formatCup(summary.difference)}
            status={summary.status}
          />
        </div>
      ) : (
        <div className="ds-empty">
          <span className="ds-empty__icon">
            <Icon name="calculate" />
          </span>
          <h2 className="ds-empty__title">Sin cuadre para esta fecha</h2>
          <p className="ds-empty__desc">
            {canCreate
              ? 'Selecciona la fecha y pulsa "Generar Cuadre" para crear el cierre de caja.'
              : "No se encontró un cuadre diario para la fecha seleccionada."}
          </p>
        </div>
      )}

      {/* ── TABLA DE INVENTARIO ── */}
      {summary && summary.inventoryItems.length > 0 && (
        <InventoryTable items={summary.inventoryItems} />
      )}

      {/* ── MODAL ── */}
      <GenerateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultDate={selectedDate}
        onSuccess={() => void refetch()}
      />
    </div>
  );
}
