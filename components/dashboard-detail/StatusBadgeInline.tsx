"use client";

import { Icon } from "@/components/ui/Icon";

/** Misma semántica que en ventas: Draft / Confirmed / Cancelled */
function normalizeStatus(status: string): string {
  const s = (status ?? "").trim().toLowerCase();
  if (s === "draft") return "Draft";
  if (s === "confirmed") return "Confirmed";
  if (s === "returned") return "Returned";
  if (s === "cancelled" || s === "canceled") return "Cancelled";
  return status;
}

const STATUS_DISPLAY: Record<
  string,
  { cls: string; icon: string; label: string }
> = {
  Draft: { cls: "sale-status--draft", icon: "pending", label: "Pendiente" },
  Confirmed: {
    cls: "sale-status--confirmed",
    icon: "check_circle",
    label: "Aceptada",
  },
  Cancelled: {
    cls: "sale-status--cancelled",
    icon: "cancel",
    label: "Cancelada",
  },
  Returned: {
    cls: "sale-status--returned",
    icon: "undo",
    label: "Devolución total",
  },
};

export function StatusBadgeInline({ status }: { status: string }) {
  const key = normalizeStatus(status);
  const d = STATUS_DISPLAY[key] ?? {
    cls: "sale-status--draft",
    icon: "help",
    label: status,
  };
  return (
    <span className={`sale-status ${d.cls}`}>
      <Icon name={d.icon} />
      {d.label}
    </span>
  );
}
