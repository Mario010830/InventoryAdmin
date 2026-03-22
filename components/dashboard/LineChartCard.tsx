"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { theme } from "./theme";

export interface LineChartCardProps {
  title: string;
  subtitle?: string;
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  filled?: boolean;
}

export function LineChartCard({
  title,
  subtitle,
  data,
  color = theme.accent,
  height = 280,
  filled = true,
}: LineChartCardProps) {
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
          {filled ? (
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.divider} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: theme.secondaryText }} stroke={theme.divider} />
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ background: theme.surface, border: `1px solid ${theme.divider}`, borderRadius: 8 }}
                labelStyle={{ color: theme.primaryText }}
              />
              <Area type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.divider} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: theme.secondaryText }} stroke={theme.divider} />
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip
                contentStyle={{ background: theme.surface, border: `1px solid ${theme.divider}`, borderRadius: 8 }}
                labelStyle={{ color: theme.primaryText }}
              />
              <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ fill: color }} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
