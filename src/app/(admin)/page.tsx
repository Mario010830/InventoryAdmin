import type { Metadata } from "next";
import DemographicCard from "@/components/ecommerce/DemographicCard";
import { EcommerceMetrics } from "@/components/ecommerce/EcommerceMetrics";
import MonthlySalesChart from "@/components/ecommerce/MonthlySalesChart";
import MonthlyTarget from "@/components/ecommerce/MonthlyTarget";
import RecentOrders from "@/components/ecommerce/RecentOrders";
import StatisticsChart from "@/components/ecommerce/StatisticsChart";
import Link from "next/link";
import React from "react";

export const metadata: Metadata = {
  title: "Inicio | SILIPE",
  description:
    "Panel de administración — Sistema de Licencias de Pesca en Cuba",
};

const quickLinks = [
  {
    href: "/solicitudes",
    label: "Solicitudes",
    hint: "Gestionar solicitudes",
  },
  {
    href: "/licencias",
    label: "Licencias",
    hint: "Licencias emitidas",
  },
  { href: "/barcos", label: "Barcos", hint: "Embarcaciones" },
  {
    href: "/usuarios",
    label: "Usuarios",
    hint: "Gestores e inspectores",
  },
  { href: "/profile", label: "Perfil", hint: "Tu cuenta" },
];

export default function AdminHomePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          SILIPE
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400 sm:text-base">
          Sistema de Licencias de Pesca en Cuba. Los gráficos e indicadores
          inferiores son datos de ejemplo de la plantilla; sustitúyelos por tu
          API cuando esté lista.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {quickLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-xl border border-gray-200 bg-white px-4 py-3 transition hover:border-brand-300 dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-700"
          >
            <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
              {item.label}
            </span>
            <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
              {item.hint}
            </span>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 space-y-6 xl:col-span-7">
          <EcommerceMetrics />
          <MonthlySalesChart />
        </div>

        <div className="col-span-12 xl:col-span-5">
          <MonthlyTarget />
        </div>

        <div className="col-span-12">
          <StatisticsChart />
        </div>

        <div className="col-span-12 xl:col-span-5">
          <DemographicCard />
        </div>

        <div className="col-span-12 xl:col-span-7">
          <RecentOrders />
        </div>
      </div>
    </div>
  );
}
