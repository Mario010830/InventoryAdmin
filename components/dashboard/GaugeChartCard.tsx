"use client";

export interface GaugeChartCardProps {
  title: string;
  subtitle?: string;
  /** Porcentaje de salud (0–100). */
  value: number;
  /** Desglose para las cajas inferiores: En rango, Stock bajo, Crítico. */
  breakdown?: { enRango: number; bajo: number; critico: number };
  height?: number;
}

const MIN = 0;
const MAX = 100;
const VIEWBOX_WIDTH = 180;
const VIEWBOX_HEIGHT = 100;
const CX = 90;
const CY = 80;
const R = 58;
const STROKE = 10;
const START_ANGLE = 180;
const END_ANGLE = 0;

const COLORS = {
  critico: "#EF4444",
  bajo: "#F59E0B",
  bien: "#22C55E",
  trackBg: "rgba(255,255,255,0.12)",
  text: "#FFFFFF",
  textMuted: "rgba(255,255,255,0.7)",
} as const;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polarToCartesian(cx, cy, r, startDeg);
  const end = polarToCartesian(cx, cy, r, endDeg);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  const sweep = startDeg > endDeg ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} ${sweep} ${end.x} ${end.y}`;
}

function gaugeColor(pct: number): string {
  if (pct >= 60) return COLORS.bien;
  if (pct >= 30) return COLORS.bajo;
  return COLORS.critico;
}

function statusLabel(pct: number): string {
  if (pct >= 60) return "Buen estado";
  if (pct >= 30) return "Bajo";
  return "Crítico";
}

export function GaugeChartCard({
  title,
  subtitle = "Productos en rango vs total",
  value,
  breakdown,
  height = 220,
}: GaugeChartCardProps) {
  const clamped = Math.max(MIN, Math.min(MAX, value));
  const fillColor = gaugeColor(clamped);
  const status = statusLabel(clamped);

  // Escala: izquierda = 100% (bien), derecha = 0% (crítico). El valor rellena desde la derecha hacia la izquierda.
  const angleDeg = (clamped / MAX) * 180;
  const trackSegments = [
    { start: 180, end: 126, color: COLORS.bien },
    { start: 126, end: 72, color: COLORS.bajo },
    { start: 72, end: 0, color: COLORS.critico },
  ];

  return (
    <div
      style={{
        background: "#1E293B",
        borderRadius: 12,
        padding: 20,
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        overflow: "visible",
      }}
    >
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, color: COLORS.text }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{subtitle}</div>}
      </div>

      <div style={{ width: "100%", flex: 1, minHeight: 140, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <svg width="100%" height={height - 120} viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} preserveAspectRatio="xMidYMid meet" style={{ overflow: "visible" }}>
          {trackSegments.map((seg, i) => (
            <path
              key={i}
              d={describeArc(CX, CY, R, seg.start, seg.end)}
              fill="none"
              stroke={seg.color}
              strokeWidth={STROKE}
              strokeLinecap="round"
              opacity={0.35}
            />
          ))}
          <path
            d={describeArc(CX, CY, R, END_ANGLE, START_ANGLE)}
            fill="none"
            stroke={COLORS.trackBg}
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
          <path
            d={describeArc(CX, CY, R, END_ANGLE, angleDeg)}
            fill="none"
            stroke={fillColor}
            strokeWidth={STROKE}
            strokeLinecap="round"
          />
          <text x={CX} y={CY - 4} textAnchor="middle" style={{ fontSize: 26, fontWeight: 700, fill: COLORS.text, fontFamily: "system-ui, sans-serif" }}>
            {Math.round(clamped)}%
          </text>
          <text x={CX} y={CY + 12} textAnchor="middle" style={{ fontSize: 11, fill: fillColor, fontFamily: "system-ui, sans-serif" }}>
            {status}
          </text>
        </svg>

        <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 10, color: COLORS.textMuted }}>
          <span style={{ color: COLORS.bien }}>Bien &gt;60%</span>
          <span style={{ color: COLORS.bajo }}>Bajo 30-60%</span>
          <span style={{ color: COLORS.critico }}>Crítico &lt;30%</span>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12, width: "100%", justifyContent: "center", flexWrap: "wrap" }}>
          <div style={{ background: "rgba(34,197,94,0.2)", borderRadius: 8, padding: "10px 16px", minWidth: 72, textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.bien }}>{breakdown?.enRango ?? "—"}</div>
            <div style={{ fontSize: 11, color: COLORS.textMuted }}>En rango</div>
          </div>
          <div style={{ background: "rgba(245,158,11,0.2)", borderRadius: 8, padding: "10px 16px", minWidth: 72, textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.bajo }}>{breakdown?.bajo ?? "—"}</div>
            <div style={{ fontSize: 11, color: COLORS.textMuted }}>Stock bajo</div>
          </div>
          <div style={{ background: "rgba(239,68,68,0.2)", borderRadius: 8, padding: "10px 16px", minWidth: 72, textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.critico }}>{breakdown?.critico ?? "—"}</div>
            <div style={{ fontSize: 11, color: COLORS.textMuted }}>Crítico</div>
          </div>
        </div>
      </div>
    </div>
  );
}
