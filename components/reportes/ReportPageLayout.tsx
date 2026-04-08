"use client";

import type { ReactNode } from "react";

export function ReportPageLayout({
  title,
  description,
  controls,
  children,
}: {
  title: string;
  description: string;
  controls?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="dashboard-report-layout">
      <header className="dashboard-report-layout__head">
        <div className="dashboard-report-layout__title">
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {controls ? (
          <div className="dashboard-report-layout__controls">{controls}</div>
        ) : null}
      </header>
      {children}
    </div>
  );
}
