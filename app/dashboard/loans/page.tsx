"use client";

import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DataTableColumn } from "@/components/DataTable";
import { DataTable } from "@/components/DataTable";
import { DatePickerSimple } from "@/components/DatePickerSimple";
import { DeleteModal } from "@/components/DeleteModal";
import { GridFilterBar } from "@/components/dashboard";
import { LoanDetailBody } from "@/components/dashboard-detail/entityDetailBodies";
import { FormModal } from "@/components/FormModal";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Icon } from "@/components/ui/Icon";
import type {
  CreateLoanRequest,
  LoanResponse,
  UpdateLoanRequest,
} from "@/lib/dashboard-types";
import { formatDisplayCurrency } from "@/lib/formatCurrency";
import { formatLoanMoneyDisplay } from "@/lib/loanMoneyDisplay";
import {
  formatInterestRatePeriodEs,
  INTEREST_RATE_PERIODS,
  type InterestRatePeriod,
  labelInterestPercentForPeriod,
  normalizeInterestRatePeriod,
} from "@/lib/loan-interest";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import {
  SEARCH_TABLE_CHUNK_PAGE_SIZE,
  TABLE_SEARCH_DEBOUNCE_MS,
  useLoadAllRemainingPages,
} from "@/lib/useLoadAllRemainingPages";
import { useUserPermissionCodes } from "@/lib/useUserPermissionCodes";
import { useGetCurrenciesQuery } from "../settings/_service/currencyApi";
import {
  useCreateLoanMutation,
  useDeleteLoanMutation,
  useGetLoansQuery,
  useUpdateLoanMutation,
} from "./_service/loansApi";
import "../products/products-modal.css";
import "./loans-form.css";

type DueDateRow = { id: string; value: string };

function newDueDateRowId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `due-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function dueDateStringsToInputs(dates: string[] | undefined): DueDateRow[] {
  if (!dates?.length) return [];
  return dates.map((d) => ({
    id: newDueDateRowId(),
    value: d.length >= 10 ? d.slice(0, 10) : d,
  }));
}

function inputsToDueDatesIso(dates: string[]): string[] {
  return dates
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => `${d}T00:00:00.000Z`);
}

const initialForm = {
  debtorName: "",
  principalAmount: "",
  principalCurrencyId: "",
  notes: "",
  interestPercent: "",
  interestRatePeriod: "annual" as InterestRatePeriod,
  interestStartDate: "",
  dueDateInputs: [] as DueDateRow[],
};

/** Compat: respuestas antiguas con `interestPercentPerYear` (migración a annual). */
function loanInterestFromResponse(loan: LoanResponse): {
  percent: number | null;
  period: InterestRatePeriod;
} {
  const legacy = loan as LoanResponse & {
    interestPercentPerYear?: number | null;
  };
  const percent = loan.interestPercent ?? legacy.interestPercentPerYear ?? null;
  const period: InterestRatePeriod =
    normalizeInterestRatePeriod(loan.interestRatePeriod) ??
    (percent != null ? "annual" : "annual");
  return { percent, period };
}

function parseInterestPercentInput(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function sameInterestPercent(a: number | null, b: number | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return Math.abs(a - b) < 1e-9;
}

function samePrincipalCurrencyId(
  a: number | null | undefined,
  b: number | null | undefined,
): boolean {
  const na = a ?? null;
  const nb = b ?? null;
  return na === nb;
}

function formatPrincipalTableCell(row: LoanResponse): string {
  return formatLoanMoneyDisplay(row, Number(row.principalAmount), {
    fallback: formatDisplayCurrency,
    decimals: 2,
  });
}

function formatLoanTableAmount(row: LoanResponse, amount: number): string {
  return formatLoanMoneyDisplay(row, amount, {
    fallback: formatDisplayCurrency,
    decimals: 2,
  });
}

export default function LoansPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [filterText, setFilterText] = useState("");
  const debouncedFilterText = useDebouncedValue(
    filterText,
    TABLE_SEARCH_DEBOUNCE_MS,
  );
  const perPage = Math.max(pageSize, SEARCH_TABLE_CHUNK_PAGE_SIZE);
  const loadNextPage = useCallback(() => setPage((p) => p + 1), []);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LoanResponse | null>(null);
  const [form, setForm] = useState(initialForm);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState<LoanResponse | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const filtersChanged = useRef(false);

  const { has: hasPermission } = useUserPermissionCodes();
  const canReadLoan = hasPermission("loan.read");
  const canCreateLoan = hasPermission("loan.create");
  const canEditLoan = hasPermission("loan.update");
  const canDeleteLoan = hasPermission("loan.delete");
  const canReadCurrency = hasPermission("currency.read");

  const {
    data: result,
    isLoading,
    isFetching,
  } = useGetLoansQuery({ page, perPage }, { skip: !canReadLoan });

  const [createLoan] = useCreateLoanMutation();
  const [updateLoan] = useUpdateLoanMutation();
  const [deleteLoan] = useDeleteLoanMutation();

  const { data: currencies = [] } = useGetCurrenciesQuery(undefined, {
    skip: !canReadCurrency || !formOpen,
  });
  const activeCurrencies = useMemo(
    () => currencies.filter((c) => c.isActive),
    [currencies],
  );

  const [allRows, setAllRows] = useState<LoanResponse[]>([]);

  useEffect(() => {
    if (!formOpen || editing) return;
    if (!activeCurrencies.length || form.principalCurrencyId !== "") return;
    const def =
      activeCurrencies.find((c) => c.isDefaultDisplay) ?? activeCurrencies[0];
    if (def) {
      setForm((f) => ({ ...f, principalCurrencyId: String(def.id) }));
    }
  }, [formOpen, editing, activeCurrencies, form.principalCurrencyId]);

  useEffect(() => {
    if (!result?.data) return;
    setAllRows((prev) => {
      if (page === 1) return result.data;
      const existingIds = new Set(prev.map((r) => r.id));
      const fresh = result.data.filter((r) => !existingIds.has(r.id));
      return [...prev, ...fresh];
    });
  }, [result?.data, page]);

  useLoadAllRemainingPages({
    isFetching,
    pagination: result?.pagination,
    loadNextPage,
  });

  useEffect(() => {
    if (!filtersChanged.current) {
      filtersChanged.current = true;
      return;
    }
    setPage(1);
    setAllRows([]);
  }, []);

  const loadedRows =
    page === 1 && allRows.length === 0 ? (result?.data ?? []) : allRows;

  const clearGridFilters = () => setFilterText("");

  const filteredData = useMemo(() => {
    let rows = loadedRows;
    const q = debouncedFilterText.trim().toLowerCase();
    if (q) {
      rows = rows.filter((row) =>
        String(row.debtorName ?? "")
          .toLowerCase()
          .includes(q),
      );
    }
    return rows;
  }, [loadedRows, debouncedFilterText]);

  const gridFiltersActive = filterText.trim() !== "";

  const allPagesLoaded =
    result?.pagination != null && page >= (result.pagination.totalPages ?? 1);

  const columns: DataTableColumn<LoanResponse>[] = useMemo(
    () => [
      { key: "debtorName", label: "Deudor", width: "180px" },
      {
        key: "principalAmount",
        label: "Capital",
        width: "140px",
        render: (row) => formatPrincipalTableCell(row),
      },
      {
        key: "totalPaid",
        label: "Cobrado",
        width: "120px",
        render: (row) => formatLoanTableAmount(row, Number(row.totalPaid)),
      },
      {
        key: "outstandingPrincipal",
        label: "Pendiente",
        width: "120px",
        render: (row) =>
          formatLoanTableAmount(row, Number(row.outstandingPrincipal)),
      },
      {
        key: "estimatedTotalDue",
        label: "Saldo estimado",
        width: "130px",
        render: (row) =>
          formatLoanTableAmount(row, Number(row.estimatedTotalDue)),
      },
      { key: "createdAt", label: "Alta", type: "date", width: "120px" },
    ],
    [],
  );

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (item: LoanResponse) => {
    setEditing(item);
    const { percent, period } = loanInterestFromResponse(item);
    setForm({
      debtorName: item.debtorName,
      principalAmount: String(item.principalAmount),
      principalCurrencyId:
        item.principalCurrencyId != null
          ? String(item.principalCurrencyId)
          : "",
      notes: item.notes ?? "",
      interestPercent: percent != null ? String(percent) : "",
      interestRatePeriod: period,
      interestStartDate:
        item.interestStartDate && item.interestStartDate.length >= 10
          ? item.interestStartDate.slice(0, 10)
          : "",
      dueDateInputs: dueDateStringsToInputs(item.dueDates),
    });
    setFormErrors({});
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const validate = (): boolean => {
    const err: Record<string, string> = {};
    if (!form.debtorName.trim())
      err.debtorName = "El nombre del deudor es obligatorio";
    const principal = Number(String(form.principalAmount).replace(",", "."));
    if (!Number.isFinite(principal) || principal < 0) {
      err.principalAmount = "Indica un capital válido (≥ 0)";
    }
    if (!normalizeInterestRatePeriod(form.interestRatePeriod)) {
      err.interestRatePeriod = "Periodicidad no válida";
    }
    if (form.interestPercent.trim()) {
      const p = parseInterestPercentInput(form.interestPercent);
      if (p === null || p < 0) {
        err.interestPercent = "Indica un porcentaje válido (≥ 0)";
      }
    }
    if (canReadCurrency && activeCurrencies.length > 0) {
      const cid = Number(form.principalCurrencyId);
      if (!Number.isFinite(cid) || cid <= 0) {
        err.principalCurrencyId = "Elige la moneda del capital";
      }
    }
    setFormErrors(err);
    return Object.keys(err).length === 0;
  };

  const buildCreatePayload = (): CreateLoanRequest => {
    const principal = Number(String(form.principalAmount).replace(",", "."));
    const interestStartDate = form.interestStartDate.trim()
      ? `${form.interestStartDate.trim()}T00:00:00.000Z`
      : null;
    const parsed = parseInterestPercentInput(form.interestPercent);
    const period =
      normalizeInterestRatePeriod(form.interestRatePeriod) ?? "annual";

    const base: CreateLoanRequest = {
      debtorName: form.debtorName.trim(),
      principalAmount: principal,
      notes: form.notes.trim() || null,
      interestStartDate,
      dueDates: inputsToDueDatesIso(form.dueDateInputs.map((r) => r.value)),
    };

    if (form.interestPercent.trim() !== "" && parsed !== null) {
      base.interestPercent = parsed;
      base.interestRatePeriod = period;
    }

    if (canReadCurrency) {
      const cid = Number(form.principalCurrencyId);
      if (Number.isFinite(cid) && cid > 0) {
        base.principalCurrencyId = cid;
      }
    }

    return base;
  };

  const buildUpdatePayload = (): UpdateLoanRequest => {
    if (!editing) {
      return {};
    }
    const principal = Number(String(form.principalAmount).replace(",", "."));
    const interestStartDate = form.interestStartDate.trim()
      ? `${form.interestStartDate.trim()}T00:00:00.000Z`
      : null;

    const parsed = parseInterestPercentInput(form.interestPercent);
    const nextP = form.interestPercent.trim() === "" ? null : parsed;
    const nextPeriod =
      normalizeInterestRatePeriod(form.interestRatePeriod) ?? "annual";
    const prev = loanInterestFromResponse(editing);

    const body: UpdateLoanRequest = {
      debtorName: form.debtorName.trim(),
      principalAmount: principal,
      notes: form.notes.trim() || null,
      interestStartDate,
      dueDates: inputsToDueDatesIso(form.dueDateInputs.map((r) => r.value)),
    };

    if (!sameInterestPercent(prev.percent, nextP)) {
      body.interestPercent = nextP;
    }
    if (nextPeriod !== prev.period) {
      body.interestRatePeriod = nextPeriod;
    }

    if (canReadCurrency) {
      const cid = Number(form.principalCurrencyId);
      const nextCur: number | null =
        Number.isFinite(cid) && cid > 0 ? cid : null;
      if (
        !samePrincipalCurrencyId(editing.principalCurrencyId ?? null, nextCur)
      ) {
        body.principalCurrencyId = nextCur;
      }
    }

    return body;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setFormSubmitting(true);
    try {
      if (editing) {
        await updateLoan({
          id: editing.id,
          body: buildUpdatePayload(),
        }).unwrap();
      } else {
        await createLoan(buildCreatePayload()).unwrap();
        setPage(1);
      }
      closeForm();
    } catch (err) {
      setFormErrors({
        submit: err instanceof Error ? err.message : "Error al guardar",
      });
    } finally {
      setFormSubmitting(false);
    }
  };

  const openDelete = (item: LoanResponse) => {
    setDeleting(item);
    setDeleteError("");
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    setConfirmOpen(false);
    setDeleting(null);
    setDeleteError("");
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteLoan(deleting.id).unwrap();
      closeConfirm();
    } catch {
      setDeleteError("Error al eliminar. Intenta de nuevo.");
    }
  };

  const addDueDateRow = () => {
    setForm((f) => ({
      ...f,
      dueDateInputs: [...f.dueDateInputs, { id: newDueDateRowId(), value: "" }],
    }));
  };

  const setDueDateAt = (id: string, value: string) => {
    setForm((f) => ({
      ...f,
      dueDateInputs: f.dueDateInputs.map((row) =>
        row.id === id ? { ...row, value } : row,
      ),
    }));
  };

  const removeDueDateAt = (id: string) => {
    setForm((f) => ({
      ...f,
      dueDateInputs: f.dueDateInputs.filter((row) => row.id !== id),
    }));
  };

  if (!canReadLoan) {
    return (
      <div style={{ padding: 24 }}>
        <p>No tienes permiso para ver préstamos.</p>
      </div>
    );
  }

  return (
    <>
      <DataTable
        gridConfig={{
          storageKey: "dashboard-loans",
          exportFilenamePrefix: "prestamos",
          primaryColumnKey: "debtorName",
        }}
        filters={
          <GridFilterBar onClear={clearGridFilters}>
            <div className="grid-filter-bar__field">
              <span className="grid-filter-bar__label">Buscar</span>
              <input
                type="search"
                className={`grid-filter-bar__control grid-filter-bar__control--wide ${filterText.trim() ? "grid-filter-bar__control--active" : ""}`}
                placeholder="Nombre del deudor…"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
            </div>
          </GridFilterBar>
        }
        data={filteredData}
        columns={columns}
        loading={allRows.length === 0 && (isLoading || isFetching)}
        title="Préstamos"
        titleIcon="payments"
        addLabel="Nuevo préstamo"
        onAdd={openCreate}
        addDisabled={!canCreateLoan}
        actions={[
          {
            icon: "edit",
            label: "Editar",
            onClick: openEdit,
            disabled: () => !canEditLoan,
          },
          {
            icon: "delete_outline",
            label: "Eliminar",
            onClick: openDelete,
            variant: "danger",
            disabled: () => !canDeleteLoan,
          },
        ]}
        detailDrawer={{
          entityLabelPlural: "préstamos",
          getTitle: (row) => row.debtorName,
          getStatusBadge: (row) => (
            <span
              className={`dt-tag ${
                row.outstandingPrincipal > 0
                  ? "dt-tag--neutral"
                  : "dt-tag--green"
              }`}
            >
              {row.outstandingPrincipal > 0 ? "Pendiente" : "Al día"}
            </span>
          ),
          render: (row) => (
            <LoanDetailBody row={row} canRegisterPayment={canEditLoan} />
          ),
          onEdit: openEdit,
          showEditButton: () => canEditLoan,
        }}
        infiniteScroll
        hasMore={!allPagesLoaded}
        loadingMore={isFetching && !allPagesLoaded}
        emptyIcon="payments"
        emptyTitle="Sin préstamos"
        emptyDesc={
          gridFiltersActive && loadedRows.length > 0
            ? "Ningún préstamo coincide con la búsqueda."
            : "Aún no hay préstamos registrados"
        }
      />

      {formOpen && (
        <FormModal
          open={formOpen}
          onClose={closeForm}
          title={editing ? "Editar préstamo" : "Nuevo préstamo"}
          icon={editing ? "edit" : "payments"}
          onSubmit={handleSubmit}
          submitting={formSubmitting}
          submitLabel={editing ? "Guardar" : "Crear"}
          error={formErrors.submit}
          maxWidth="640px"
        >
          {/* field-full: FormModal ya aplica .modal-form-grid al body; sin esto el bloque solo ocupa 1 columna */}
          <div className="loan-form field-full">
            <div className="modal-form-grid loan-form__inner-grid">
              <div className="modal-field field-full">
                <label htmlFor="loan-debtor">Deudor *</label>
                <input
                  id="loan-debtor"
                  autoComplete="name"
                  placeholder="Nombre de quien debe"
                  value={form.debtorName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, debtorName: e.target.value }))
                  }
                />
                {formErrors.debtorName ? (
                  <p className="form-error">{formErrors.debtorName}</p>
                ) : null}
              </div>
              <div className="modal-field">
                <label htmlFor="loan-principal">Capital *</label>
                <input
                  id="loan-principal"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0,00"
                  value={form.principalAmount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, principalAmount: e.target.value }))
                  }
                />
                {formErrors.principalAmount ? (
                  <p className="form-error">{formErrors.principalAmount}</p>
                ) : null}
              </div>
              {canReadCurrency && activeCurrencies.length > 0 ? (
                <div className="modal-field">
                  <label htmlFor="loan-principal-currency">
                    Moneda del capital *
                  </label>
                  <select
                    id="loan-principal-currency"
                    value={form.principalCurrencyId}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        principalCurrencyId: e.target.value,
                      }))
                    }
                  >
                    <option value="">Elige…</option>
                    {activeCurrencies.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.principalCurrencyId ? (
                    <p className="form-error">
                      {formErrors.principalCurrencyId}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div className="modal-field">
                <div className="loan-form__period-label-row">
                  <label
                    htmlFor="loan-interest-period"
                    className="loan-form__inline-label"
                  >
                    Periodicidad del interés
                  </label>
                  <Popover modal={false}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="loan-form__field-help"
                        aria-label="Ayuda sobre periodicidad del interés"
                      >
                        ?
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="top"
                      align="start"
                      sideOffset={8}
                      collisionPadding={16}
                      className="z-[13000] w-[min(22rem,calc(100vw-2rem))] border border-slate-200 bg-white p-3 text-sm leading-snug text-slate-700 shadow-xl"
                    >
                      <p className="m-0">
                        La <strong>periodicidad</strong> define cada cuánto se
                        aplica la tasa. El <strong>porcentaje</strong> del otro
                        campo es siempre respecto a ese periodo (por ejemplo, 2 %
                        mensual o 10 % anual), no un «interés anual» fijo aparte.
                      </p>
                    </PopoverContent>
                  </Popover>
                </div>
                <select
                  id="loan-interest-period"
                  value={form.interestRatePeriod}
                  onChange={(e) => {
                    const v = normalizeInterestRatePeriod(e.target.value);
                    setForm((f) => ({
                      ...f,
                      interestRatePeriod: v ?? "annual",
                    }));
                  }}
                >
                  {INTEREST_RATE_PERIODS.map((p) => (
                    <option key={p} value={p}>
                      {formatInterestRatePeriodEs(p)}
                    </option>
                  ))}
                </select>
                {formErrors.interestRatePeriod ? (
                  <p className="form-error">{formErrors.interestRatePeriod}</p>
                ) : null}
              </div>
              <div className="modal-field">
                <label htmlFor="loan-interest-pct">
                  {labelInterestPercentForPeriod(form.interestRatePeriod)}
                </label>
                <input
                  id="loan-interest-pct"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Opcional"
                  value={form.interestPercent}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, interestPercent: e.target.value }))
                  }
                />
                {formErrors.interestPercent ? (
                  <p className="form-error">{formErrors.interestPercent}</p>
                ) : null}
              </div>
              <div className="modal-field">
                <label htmlFor="loan-interest-start">Inicio del interés</label>
                <DatePickerSimple
                  date={form.interestStartDate}
                  setDate={(d) =>
                    setForm((f) => ({ ...f, interestStartDate: d }))
                  }
                  emptyLabel="Sin fecha"
                  triggerId="loan-interest-start"
                  buttonClassName="h-10 min-h-10 border-slate-200 bg-white text-[0.9rem]"
                />
              </div>
              <div className="modal-field loan-form__hint-cell">
                <p className="loan-form__hint">
                  Opcional. Base para calcular el interés estimado en el
                  detalle.
                </p>
              </div>
              <div className="modal-field field-full">
                <div className="loan-due-dates">
                  <div className="loan-due-dates__toolbar">
                    <div className="loan-due-dates__head">
                      <p className="loan-due-dates__title">
                        Fechas previstas de cobro
                      </p>
                      <p className="loan-due-dates__hint">
                        Opcional — añade plazos si quieres recordatorios.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="loan-due-dates__add-inline"
                      onClick={addDueDateRow}
                    >
                      <Plus size={15} strokeWidth={2.5} aria-hidden />
                      Añadir
                    </button>
                  </div>
                  {form.dueDateInputs.length > 0 ? (
                    <div className="loan-due-dates__list">
                      {form.dueDateInputs.map((row, idx) => (
                        <div key={row.id} className="loan-due-dates__row">
                          <span className="loan-due-dates__idx" aria-hidden>
                            {idx + 1}.
                          </span>
                          <div className="loan-due-dates__picker">
                            <DatePickerSimple
                              date={row.value}
                              setDate={(d) => setDueDateAt(row.id, d)}
                              emptyLabel="Elegir fecha"
                              triggerId={`loan-due-${row.id}`}
                              triggerAriaLabel={`Fecha de cobro ${idx + 1}`}
                              buttonClassName="h-9 min-h-9 border-slate-200 bg-white text-[0.875rem]"
                            />
                          </div>
                          <button
                            type="button"
                            className="loan-due-dates__remove"
                            aria-label="Quitar esta fecha"
                            onClick={() => removeDueDateAt(row.id)}
                          >
                            <Icon name="delete_outline" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="modal-field field-full">
                <label htmlFor="loan-notes">Notas</label>
                <textarea
                  id="loan-notes"
                  placeholder="Observaciones del préstamo…"
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  rows={3}
                />
              </div>
            </div>
          </div>
        </FormModal>
      )}

      {confirmOpen && deleting ? (
        <DeleteModal
          open={confirmOpen && !!deleting}
          onClose={closeConfirm}
          onConfirm={handleDelete}
          title="¿Eliminar préstamo?"
          itemName={deleting.debtorName}
          error={deleteError}
        />
      ) : null}
    </>
  );
}
