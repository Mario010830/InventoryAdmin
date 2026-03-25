"use client";

import { ReportPageLayout } from "@/components/reportes/ReportPageLayout";

export default function ReportesVentasPage() {
  return (
    <ReportPageLayout
      title="Reporte de ventas"
      description="Análisis de ventas, devoluciones y órdenes."
    >
      <p className="rounded-lg border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-slate-500">
        Próximamente
      </p>
    </ReportPageLayout>
  );
}
