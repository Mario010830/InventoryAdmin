"use client";

import type { ReactNode } from "react";

export function ReportPageLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="w-full min-w-0">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </header>
      {children}
    </div>
  );
}
