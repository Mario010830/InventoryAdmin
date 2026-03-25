"use client";

import type { LucideIcon } from "lucide-react";
import { Boxes, GitBranch, Package, ShoppingCart, Users } from "lucide-react";
import Link from "next/link";
import { ReportPageLayout } from "@/components/reportes/ReportPageLayout";

const CARDS: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    href: "/reportes/ventas",
    title: "Ventas",
    description: "Resumen de ventas, devoluciones y órdenes.",
    icon: ShoppingCart,
  },
  {
    href: "/reportes/inventario",
    title: "Inventario",
    description: "Stock, valorización y movimientos.",
    icon: Boxes,
  },
  {
    href: "/reportes/productos",
    title: "Productos",
    description: "Productos más vendidos y distribución por categoría.",
    icon: Package,
  },
  {
    href: "/reportes/crm",
    title: "CRM",
    description: "Leads y conversión.",
    icon: Users,
  },
  {
    href: "/reportes/operaciones",
    title: "Operaciones",
    description: "Movimientos por tipo.",
    icon: GitBranch,
  },
];

export default function ReportesIndexPage() {
  return (
    <ReportPageLayout
      title="Reportes"
      description="Elige un reporte para ver el detalle. El contenido detallado estará disponible próximamente."
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.href}
              href={c.href}
              className="group flex flex-col rounded-xl border border-[#eceff4] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition hover:border-[#c7d2fe] hover:shadow-md"
            >
              <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#eef2ff] text-[#4f6ef7] transition group-hover:bg-[#e0e7ff]">
                <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="text-base font-semibold text-slate-900">
                {c.title}
              </span>
              <span className="mt-1 text-sm text-slate-600">
                {c.description}
              </span>
              <span className="mt-4 text-sm font-medium text-[#4f6ef7]">
                Abrir →
              </span>
            </Link>
          );
        })}
      </div>
      <p className="mt-8 text-center text-sm text-slate-500">Próximamente</p>
    </ReportPageLayout>
  );
}
