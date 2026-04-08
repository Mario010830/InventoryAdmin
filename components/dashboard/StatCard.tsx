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
  iconBg = "#EEF2FF",
  iconColor = theme.accent,
}: StatCardProps) {
  return (
    <div
      className="dashboard-card dashboard-card--stat"
      style={{
        background: theme.surface,
      }}
    >
      <div className="dashboard-kpi__head">
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
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
      <div className="dashboard-kpi__body">
        <span className="dashboard-kpi__label">{label}</span>
        <span className="dashboard-kpi__value">{value}</span>
      </div>
    </div>
  );
}
