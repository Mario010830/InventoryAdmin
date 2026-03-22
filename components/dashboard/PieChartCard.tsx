"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { theme } from "./theme";

export interface PieChartCardProps {
  title: string;
  data: { name: string; value: number }[];
  colors?: readonly string[];
  height?: number;
  showLegend?: boolean;
}

export function PieChartCard({
  title,
  data,
  colors = theme.chart,
  height = 280,
  showLegend = true,
}: PieChartCardProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const withPercent = data.map((d) => ({
    ...d,
    percentLabel: total > 0 ? `${((d.value / total) * 100).toFixed(1)}%` : "0%",
  }));

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
      <div style={{ fontSize: 16, fontWeight: 600, color: theme.primaryText }}>{title}</div>
      <div style={{ width: "100%", height, minHeight: height, minWidth: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={height}>
          <PieChart>
            <Pie
              data={withPercent}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="55%"
              outerRadius="80%"
              paddingAngle={2}
              label={false}
            >
              {withPercent.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} stroke={theme.surface} strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number | undefined, name?: string, item?: { payload?: { percentLabel?: string } }) => [
                `${value ?? 0} (${item?.payload?.percentLabel ?? ""})`,
                name ?? "",
              ]}
              contentStyle={{ background: theme.surface, border: `1px solid ${theme.divider}`, borderRadius: 8 }}
            />
            {showLegend && (
              <Legend
                formatter={(value) => <span style={{ color: theme.primaryText, fontSize: 12 }}>{value}</span>}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
