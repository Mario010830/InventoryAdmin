"use client";

import { useMemo } from "react";
import type { BusinessHoursDto } from "@/lib/dashboard-types";

const HOURS_24 = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0"),
);
const MINUTES_60 = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, "0"),
);

function parseHHMM(t: string): { h: string; m: string } | null {
  if (!/^\d{2}:\d{2}$/.test(t)) return null;
  const h = t.slice(0, 2);
  const m = t.slice(3, 5);
  const hn = Number(h);
  const mn = Number(m);
  if (!Number.isFinite(hn) || !Number.isFinite(mn) || hn > 23 || mn > 59)
    return null;
  return { h, m };
}

/** Selector de hora en 24 h con listas desplegables (mejor UX que `input type="time"` en muchos navegadores). */
function TimeSelect24({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  ariaLabel: string;
}) {
  const parts = parseHHMM(value);
  const h = parts?.h ?? "";
  const m = parts?.m ?? "";

  const setHour = (nextH: string) => {
    if (nextH === "") {
      onChange("");
      return;
    }
    const mm = m || "00";
    onChange(`${nextH}:${mm}`);
  };

  const setMinute = (nextM: string) => {
    if (nextM === "") {
      onChange("");
      return;
    }
    const hh = h || "09";
    onChange(`${hh}:${nextM}`);
  };

  const minuteOptions = useMemo(() => {
    if (!m || MINUTES_60.includes(m)) return MINUTES_60;
    return [...MINUTES_60, m].sort();
  }, [m]);

  return (
    <div className="bh-timeblock" role="group" aria-label={ariaLabel}>
      <select
        className="bh-timeblock__select bh-timeblock__select--hour"
        value={h}
        onChange={(e) => setHour(e.target.value)}
        aria-label={`${ariaLabel}, hora`}
      >
        <option value="">—</option>
        {HOURS_24.map((hh) => (
          <option key={hh} value={hh}>
            {hh}
          </option>
        ))}
      </select>
      <span className="bh-timeblock__colon" aria-hidden>
        :
      </span>
      <select
        className="bh-timeblock__select bh-timeblock__select--minute"
        value={m}
        onChange={(e) => setMinute(e.target.value)}
        aria-label={`${ariaLabel}, minutos`}
      >
        <option value="">—</option>
        {minuteOptions.map((mm) => (
          <option key={mm} value={mm}>
            {mm}
          </option>
        ))}
      </select>
    </div>
  );
}

type DayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface BusinessHoursDayState {
  isOpen: boolean;
  open: string;
  close: string;
}

export type BusinessHoursFormState = Record<DayKey, BusinessHoursDayState>;

const DAY_LABELS: { key: DayKey; label: string }[] = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miércoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
];

export function makeEmptyBusinessHoursState(): BusinessHoursFormState {
  return {
    monday: { isOpen: false, open: "", close: "" },
    tuesday: { isOpen: false, open: "", close: "" },
    wednesday: { isOpen: false, open: "", close: "" },
    thursday: { isOpen: false, open: "", close: "" },
    friday: { isOpen: false, open: "", close: "" },
    saturday: { isOpen: false, open: "", close: "" },
    sunday: { isOpen: false, open: "", close: "" },
  };
}

export function deserializeBusinessHoursDto(
  dto: BusinessHoursDto | null | undefined,
): BusinessHoursFormState {
  const base = makeEmptyBusinessHoursState();
  if (!dto) return base;
  for (const { key } of DAY_LABELS) {
    const d = dto[key];
    if (d && typeof d.open === "string" && typeof d.close === "string") {
      base[key] = { isOpen: true, open: d.open, close: d.close };
    }
  }
  return base;
}

export function serializeBusinessHoursState(
  state: BusinessHoursFormState,
): BusinessHoursDto {
  const result: BusinessHoursDto = {};
  for (const { key } of DAY_LABELS) {
    const d = state[key];
    if (d.isOpen && d.open && d.close) {
      result[key] = { open: d.open, close: d.close };
    } else {
      result[key] = null;
    }
  }
  return result;
}

const DAY_NAMES: Record<DayKey, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

export function stableStringifyBusinessHoursDto(dto: BusinessHoursDto): string {
  const o: Record<string, unknown> = {};
  for (const { key } of DAY_LABELS) {
    const v = dto[key];
    o[key] = v === undefined ? null : v;
  }
  return JSON.stringify(o);
}

/** Comparar si cambió el horario de atención del negocio. */
export function businessHoursCompareKey(state: BusinessHoursFormState): string {
  return stableStringifyBusinessHoursDto(serializeBusinessHoursState(state));
}

export function validateBusinessHoursFormState(
  state: BusinessHoursFormState,
): string[] {
  const bhErrors: string[] = [];
  const timeToMinutes = (t: string): number => {
    if (!/^\d{2}:\d{2}$/.test(t)) return -1;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  for (const { key } of DAY_LABELS) {
    const v = state[key];
    if (!v.isOpen) continue;
    if (!v.open || !v.close) {
      bhErrors.push(
        `${DAY_NAMES[key]}: hora de apertura y cierre son requeridas.`,
      );
      continue;
    }
    const start = timeToMinutes(v.open);
    const end = timeToMinutes(v.close);
    if (start < 0 || end < 0 || end <= start) {
      bhErrors.push(
        `${DAY_NAMES[key]}: la hora de cierre debe ser posterior a la de apertura.`,
      );
    }
  }
  return bhErrors;
}

interface Props {
  value: BusinessHoursFormState;
  onChange: (next: BusinessHoursFormState) => void;
}

export function BusinessHoursEditor({ value, onChange }: Props) {
  const update = (day: DayKey, patch: Partial<BusinessHoursDayState>) => {
    onChange({
      ...value,
      [day]: { ...value[day], ...patch },
    });
  };

  const copyWeekdaysFromMonday = () => {
    const base = value.monday;
    if (!base.isOpen || !base.open || !base.close) return;
    onChange({
      ...value,
      tuesday: { isOpen: true, open: base.open, close: base.close },
      wednesday: { isOpen: true, open: base.open, close: base.close },
      thursday: { isOpen: true, open: base.open, close: base.close },
      friday: { isOpen: true, open: base.open, close: base.close },
    });
  };

  return (
    <div className="modal-field field-full">
      <div className="bh-editor">
        {DAY_LABELS.map(({ key, label }) => {
          const day = value[key];
          const isMonday = key === "monday";
          return (
            <div key={key} className="bh-editor__row">
              <label className="bh-editor__label">
                <input
                  type="checkbox"
                  checked={day.isOpen}
                  onChange={(e) => update(key, { isOpen: e.target.checked })}
                />
                <span>{label}</span>
              </label>

              {day.isOpen ? (
                <div className="bh-editor__time-wrap">
                  <div className="bh-editor__time-slot">
                    <span className="bh-editor__time-slot-label">Desde</span>
                    <TimeSelect24
                      value={day.open}
                      onChange={(open) => update(key, { open })}
                      ariaLabel={`${label}, apertura`}
                    />
                  </div>
                  <span className="bh-editor__separator">a</span>
                  <div className="bh-editor__time-slot">
                    <span className="bh-editor__time-slot-label">Hasta</span>
                    <TimeSelect24
                      value={day.close}
                      onChange={(close) => update(key, { close })}
                      ariaLabel={`${label}, cierre`}
                    />
                  </div>

                  {isMonday && day.open && day.close && (
                    <button
                      type="button"
                      className="bh-editor__copy-btn"
                      onClick={copyWeekdaysFromMonday}
                    >
                      Copiar al resto de días laborables
                    </button>
                  )}
                </div>
              ) : (
                <span className="bh-editor__closed">Cerrado</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
