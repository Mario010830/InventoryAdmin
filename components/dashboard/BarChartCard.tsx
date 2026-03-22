"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { theme } from "./theme";

export interface BarChartCardProps {
  title: string;
  subtitle?: string;
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  /** true = barras horizontales (por categoría/nombre) */
  horizontal?: boolean;
  /** Formato del valor en tooltip (ej. (n) => `$${n.toLocaleString()}`) */
  formatValue?: (value: number) => string;
}

export function BarChartCard({
  title,
  subtitle,
  data,
  color = theme.accent,
  height = 280,
  horizontal = false,
  formatValue,
}: BarChartCardProps) {
  const chartData = data.map((d) => ({ name: d.label, value: d.value }));

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
      <div style={{ width: "100%", height, minHeight: height, minWidth: 200 }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={height}>
          <BarChart
            data={chartData}
            layout={horizontal ? "vertical" : "horizontal"}
            margin={{ top: 4, right: 8, left: horizontal ? 60 : 4, bottom: horizontal ? 4 : 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={theme.divider} vertical={!horizontal} horizontal />
            <XAxis
              type={horizontal ? "number" : "category"}
              dataKey={horizontal ? undefined : "name"}
              tick={{ fontSize: 11, fill: theme.secondaryText }}
              stroke={theme.divider}
              hide={horizontal}
            />
            <YAxis
              type={horizontal ? "category" : "number"}
              dataKey={horizontal ? "name" : "value"}
              tick={{ fontSize: 11, fill: theme.secondaryText }}
              stroke={theme.divider}
              width={horizontal ? 55 : 0}
              hide={!horizontal}
              domain={horizontal ? undefined : [0, "auto"]}
            />
            <Tooltip
              contentStyle={{ background: theme.surface, border: `1px solid ${theme.divider}`, borderRadius: 8 }}
              labelStyle={{ color: theme.primaryText }}
              formatter={(value: number | undefined) => [formatValue ? formatValue(value ?? 0) : (value ?? 0), ""]}
            />
            <Bar dataKey="value" fill={color} radius={horizontal ? [0, 0, 4, 4] : [4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
