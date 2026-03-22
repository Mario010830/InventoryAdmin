"use client";

import { theme } from "./theme";

export interface ActivityHeatmapCell {
  dayOfWeek: number;
  hour: number;
  count: number;
}

export interface HeatmapCardProps {
  title: string;
  subtitle?: string;
  /** dayOfWeek 0 = Lun … 6 = Dom, hour 0–23 */
  data: ActivityHeatmapCell[];
  height?: number;
}

const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function getLevel(count: number, maxCount: number): number {
  if (maxCount <= 0 || count <= 0) return 0;
  if (count >= maxCount) return 4;
  const pct = count / maxCount;
  if (pct >= 0.75) return 4;
  if (pct >= 0.5) return 3;
  if (pct >= 0.25) return 2;
  return 1;
}

const LEVEL_COLORS = [
  theme.background,
  "rgba(79, 70, 229, 0.25)",
  "rgba(79, 70, 229, 0.5)",
  "rgba(79, 70, 229, 0.75)",
  theme.accent,
];

export function HeatmapCard({
  title,
  subtitle,
  data,
  height = 280,
}: HeatmapCardProps) {
  const maxCount = data.length > 0 ? Math.max(1, ...data.map((d) => d.count)) : 1;
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const cell of data) {
    const d = Math.max(0, Math.min(6, cell.dayOfWeek));
    const h = Math.max(0, Math.min(23, cell.hour));
    grid[d][h] += cell.count;
  }

  const hourLabelWidth = 32;
  const dayLabelHeight = 20;
  const rowGap = 2;
  const colGap = 2;
  const legendHeight = 24;
  const headerGap = 12;
  const totalRowGaps = 23 * rowGap;
  const rowHeight = Math.max(6, (height - dayLabelHeight - legendHeight - headerGap * 2 - totalRowGaps) / 24);

  return (
    <div
      style={{
        background: theme.surface,
        borderRadius: 10,
        padding: 16,
        border: `1px solid ${theme.divider}`,
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, color: theme.primaryText }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: theme.secondaryText, marginTop: 2 }}>{subtitle}</div>}
      </div>
      <div style={{ width: "100%", height, minHeight: height, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: rowGap, flex: 1, minHeight: 0, width: "100%" }}>
          <div style={{ height: dayLabelHeight, display: "flex", alignItems: "center", width: "100%", gap: colGap }}>
            <div style={{ width: hourLabelWidth, flexShrink: 0 }} />
            <div style={{ flex: 1, display: "flex", gap: colGap, minWidth: 0 }}>
              {DAY_LABELS.map((label, i) => (
                <div key={i} style={{ flex: 1, fontSize: 9, color: theme.secondaryText, textAlign: "center", minWidth: 0 }}>
                  {label}
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: rowGap, minHeight: 0, overflow: "hidden" }}>
            {HOURS.map((hour) => (
              <div key={hour} style={{ display: "flex", alignItems: "stretch", gap: colGap, height: rowHeight, flexShrink: 0 }}>
                <div style={{ width: hourLabelWidth, flexShrink: 0, fontSize: 9, color: theme.secondaryText, textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                  {hour}h
                </div>
                <div style={{ flex: 1, display: "flex", gap: colGap, minWidth: 0 }}>
                  {DAY_LABELS.map((_, day) => {
                    const count = grid[day][hour];
                    const level = getLevel(count, maxCount);
                    const bg = LEVEL_COLORS[level];
                    return (
                      <div
                        key={`${day}-${hour}`}
                        title={`${DAY_LABELS[day]} ${hour}:00 — ${count} mov.`}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          backgroundColor: bg,
                          borderRadius: 2,
                          border: level === 0 ? `1px solid ${theme.divider}` : "none",
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: theme.secondaryText }}>
        <span>Menos</span>
        {LEVEL_COLORS.map((c, i) => (
          <div key={i} style={{ width: 12, height: 12, backgroundColor: c, borderRadius: 2, border: i === 0 ? `1px solid ${theme.divider}` : "none" }} />
        ))}
        <span>Más</span>
      </div>
    </div>
  );
}
