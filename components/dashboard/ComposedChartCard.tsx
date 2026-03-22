"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { theme } from "./theme";

export interface ComposedChartCardProps {
  title: string;
  subtitle?: string;
  /** Barras: value. Línea opcional: lineValue (ej. acumulado). */
  data: { label: string; value: number; lineValue?: number }[];
  barColor?: string;
  lineColor?: string;
  lineName?: string;
  height?: number;
}

export function ComposedChartCard({
  title,
  subtitle,
  data,
  barColor = theme.accent,
  lineColor = theme.success,
  lineName = "Acumulado",
  height = 280,
}: ComposedChartCardProps) {
  const chartData = data.map((d) => ({
    name: d.label,
    value: d.value,
    ...(d.lineValue != null ? { lineValue: d.lineValue } : {}),
  }));

  const hasLine = chartData.some((d) => "lineValue" in d && d.lineValue != null);

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
          <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.divider} vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: theme.secondaryText }} stroke={theme.divider} />
            <YAxis hide domain={[0, "auto"]} yAxisId="bar" />
            {hasLine && <YAxis hide domain={["auto", "auto"]} yAxisId="line" orientation="right" />}
            <Tooltip
              contentStyle={{ background: theme.surface, border: `1px solid ${theme.divider}`, borderRadius: 8 }}
              labelStyle={{ color: theme.primaryText }}
              formatter={(value: number | undefined, name?: string) => [value ?? 0, name === "lineValue" ? lineName : "Cantidad"]}
              labelFormatter={(label) => label}
            />
            {hasLine && (
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                formatter={(value) => (value === "lineValue" ? lineName : "Por día")}
                iconType="line"
              />
            )}
            <Bar dataKey="value" fill={barColor} radius={[4, 4, 0, 0]} yAxisId="bar" name="value" />
            {hasLine && (
              <Line
                type="monotone"
                dataKey="lineValue"
                stroke={lineColor}
                strokeWidth={2}
                dot={{ fill: lineColor }}
                yAxisId="line"
                name="lineValue"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
