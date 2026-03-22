"use client";

import { Icon } from "@/components/ui/Icon";
import "./page-kpi-strip.css";

export interface PageKpiMetric {
  /** Material icon name */
  icon: string;
  label: string;
  value: string;
  /** Texto secundario (tendencia o detalle), más pequeño */
  sub?: string;
  /** Comparación vs período anterior u otra variación, junto al valor */
  pill?: { text: string; tone: "up" | "down" | "neutral" };
}

export function PageKpiStrip({ items }: { items: PageKpiMetric[] }) {
  if (items.length === 0) return null;
  return (
    <div className="page-kpi-strip" role="region" aria-label="Resumen">
      {items.map((it) => (
        <div key={it.label} className="page-kpi-strip__card">
          <span className="page-kpi-strip__icon" aria-hidden>
            <Icon name={it.icon} />
          </span>
          <div className="page-kpi-strip__value-row">
            <span className="page-kpi-strip__value">{it.value}</span>
            {it.pill ? (
              <span
                className={`page-kpi-strip__pill page-kpi-strip__pill--${it.pill.tone}`}
              >
                {it.pill.text}
              </span>
            ) : null}
          </div>
          <div className="page-kpi-strip__meta">
            <span className="page-kpi-strip__label">{it.label}</span>
            {it.sub ? <span className="page-kpi-strip__sub">{it.sub}</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
