"use client";

import { Icon } from "@/components/ui/Icon";
import { theme } from "./theme";

export interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  trend?: string;
  trendUp?: boolean;
  iconBg?: string;
  iconColor?: string;
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  trendUp = true,
  iconBg = "#EEF2FF",
  iconColor = theme.accent,
}: StatCardProps) {
  return (
    <div
      className="stat-card"
      style={{
        background: theme.surface,
        borderRadius: 10,
        padding: 16,
        border: `1px solid ${theme.divider}`,
        boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
        flex: 1,
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: theme.secondaryText }}>{label}</span>
          <span style={{ fontSize: 24, fontWeight: 700, color: theme.primaryText }}>{value}</span>
          {trend != null && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: trendUp ? theme.success : theme.error }}>
              <Icon name={trendUp ? "trending_up" : "trending_down"} />
              {trend}
            </span>
          )}
        </div>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            background: iconBg,
            color: iconColor,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <Icon name={icon} />
        </div>
      </div>
    </div>
  );
}
