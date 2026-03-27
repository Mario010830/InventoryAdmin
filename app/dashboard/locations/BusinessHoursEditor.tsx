import type { BusinessHoursDto } from "@/lib/dashboard-types";

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

/** Devuelve `null` si no hay ningún día con horario (el backend usa el horario general). */
export function serializeOptionalBusinessHoursState(
  state: BusinessHoursFormState,
): BusinessHoursDto | null {
  const dto = serializeBusinessHoursState(state);
  const hasAny = (Object.values(dto) as ({ open: string; close: string } | null | undefined)[]).some(
    (v) => v != null && typeof v.open === "string" && typeof v.close === "string",
  );
  return hasAny ? dto : null;
}

/** DTO con cada día en `null` (sin horario custom). En PUT, usar esto para «volver al horario general», no `null` en la raíz (eso significa no tocar el campo). */
export function emptyAllDaysBusinessHoursDto(): BusinessHoursDto {
  return serializeBusinessHoursState(makeEmptyBusinessHoursState());
}

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

/**
 * Comparar horarios opcionales de domicilio/recogida (depende de si la modalidad está activa).
 * Si la modalidad está off, solo comparamos el hecho de estar desactivada.
 */
export function deliveryPickupHoursCompareKey(
  modalityEnabled: boolean,
  state: BusinessHoursFormState,
): string {
  if (!modalityEnabled) return "__modality_off__";
  const opt = serializeOptionalBusinessHoursState(state);
  if (opt === null) {
    return `__use_general__${stableStringifyBusinessHoursDto(emptyAllDaysBusinessHoursDto())}`;
  }
  return `__custom__${stableStringifyBusinessHoursDto(opt)}`;
}

/**
 * PUT: en la raíz, `null` = no modificar ese campo.
 * - Modalidad desactivada: omitir la clave (no enviar `deliveryHours: null`).
 * - Modalidad activa y formulario en «horario general» (sin días): enviar DTO con todos los días en null.
 * - Modalidad activa con horario custom: enviar el DTO.
 */
export function serializeOptionalDeliveryPickupForPut(
  state: BusinessHoursFormState,
  modalityEnabled: boolean,
): BusinessHoursDto | undefined {
  if (!modalityEnabled) return undefined;
  const opt = serializeOptionalBusinessHoursState(state);
  if (opt === null) return emptyAllDaysBusinessHoursDto();
  return opt;
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
      bhErrors.push(`${DAY_NAMES[key]}: hora de apertura y cierre son requeridas.`);
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
                  onChange={(e) =>
                    update(key, { isOpen: e.target.checked })
                  }
                />
                <span>{label}</span>
              </label>

              {day.isOpen ? (
                <div className="bh-editor__time-wrap">
                  <input
                    type="time"
                    className="bh-editor__time"
                    value={day.open}
                    onChange={(e) => update(key, { open: e.target.value })}
                  />
                  <span className="bh-editor__separator">a</span>
                  <input
                    type="time"
                    className="bh-editor__time"
                    value={day.close}
                    onChange={(e) => update(key, { close: e.target.value })}
                  />

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

