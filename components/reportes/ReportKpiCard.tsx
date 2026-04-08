"use client";

import type { ReactNode } from "react";

export function ReportKpiCard({
  label,
  value,
  subvalue,
  averageTicket,
  trend,
  loading,
  icon,
}: {
  label: string;
  value: string;
  subvalue?: string;
  /** Texto formateado del ticket medio (reporte de ventas). */
  averageTicket?: string;
  trend?: number;
  loading?: boolean;
  icon?: ReactNode;
}) {
  if (loading) {
    return (
      <div className="dashboard-card dashboard-card--stat flex min-h-[112px] min-w-[160px] flex-1 flex-col p-5">
        <div className="mb-3 h-3 w-24 animate-pulse rounded bg-slate-200" />
        <div className="mb-2 h-8 w-32 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="dashboard-card dashboard-card--stat flex min-h-[112px] min-w-[160px] flex-1 flex-col p-5">
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="text-[0.7rem] font-bold uppercase tracking-wide text-slate-500">
          {label}
        </span>
        {icon ? (
          <span className="text-slate-400 [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-2xl font-bold tabular-nums text-slate-900">
          {value}
        </span>
      </div>
      {averageTicket ? (
        <p className="mt-1 text-xs font-medium text-slate-600">
          Ticket medio: {averageTicket}
        </p>
      ) : null}
      {subvalue ? (
        <p className="mt-1 text-xs text-slate-500">{subvalue}</p>
      ) : null}
    </div>
  );
}
