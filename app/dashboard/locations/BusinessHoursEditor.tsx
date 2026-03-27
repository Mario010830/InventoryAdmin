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

