/** Fechas de solo lectura en cajones de detalle (ej. "16 mar 2026"). */
export function formatDetailDate(iso: string | null | undefined): string {
  if (iso == null || iso === "") return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    const s = d.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return s.replace(/\.$/, "").replace(/\s+/g, " ").trim();
  } catch {
    return "—";
  }
}

export function formatDetailDateTime(iso: string | null | undefined): string {
  if (iso == null || iso === "") return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function displayDash<T>(v: T | null | undefined): string {
  if (v == null) return "—";
  if (typeof v === "string" && v.trim() === "") return "—";
  return String(v);
}
