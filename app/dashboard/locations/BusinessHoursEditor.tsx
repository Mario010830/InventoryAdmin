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
      <div
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          padding: 10,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {DAY_LABELS.map(({ key, label }, index) => {
          const day = value[key];
          const isMonday = key === "monday";
          return (
            <div
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 0",
                borderTop: index === 0 ? "none" : "1px solid #f1f5f9",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  minWidth: 120,
                }}
              >
                <input
                  type="checkbox"
                  checked={day.isOpen}
                  onChange={(e) =>
                    update(key, { isOpen: e.target.checked })
                  }
                />
                <span style={{ fontSize: "0.82rem", fontWeight: 500 }}>
                  {label}
                </span>
              </label>

              {day.isOpen ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flex: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <input
                    type="time"
                    value={day.open}
                    onChange={(e) => update(key, { open: e.target.value })}
                    style={{
                      padding: "4px 6px",
                      borderRadius: 6,
                      border: "1px solid #e2e8f0",
                      fontSize: "0.8rem",
                    }}
                  />
                  <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                    a
                  </span>
                  <input
                    type="time"
                    value={day.close}
                    onChange={(e) => update(key, { close: e.target.value })}
                    style={{
                      padding: "4px 6px",
                      borderRadius: 6,
                      border: "1px solid #e2e8f0",
                      fontSize: "0.8rem",
                    }}
                  />

                  {isMonday && day.open && day.close && (
                    <button
                      type="button"
                      onClick={copyWeekdaysFromMonday}
                      style={{
                        marginLeft: "auto",
                        fontSize: "0.75rem",
                        color: "#3b82f6",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      Copiar al resto de días laborables
                    </button>
                  )}
                </div>
              ) : (
                <span
                  style={{
                    fontSize: "0.8rem",
                    color: "#9ca3af",
                  }}
                >
                  Cerrado
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

