"use client";

import { theme } from "./theme";

export interface CompactKpiItem {
  label: string;
  value: string;
}

/** Una fila compacta de KPIs (solo número + etiqueta), sin iconos ni gráficos */
export function CompactKpiStrip({ items }: { items: CompactKpiItem[] }) {
  if (items.length === 0) return null;
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 16,
      }}
    >
      {items.map((it) => (
        <div
          key={it.label}
          style={{
            flex: "1 1 120px",
            minWidth: 100,
            maxWidth: 200,
            padding: "12px 14px",
            borderRadius: 10,
            border: `1px solid ${theme.divider}`,
            background: theme.surface,
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: theme.secondaryText, marginBottom: 4 }}>
            {it.label}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: theme.primaryText, lineHeight: 1.15 }}>
            {it.value}
          </div>
        </div>
      ))}
    </div>
  );
}
