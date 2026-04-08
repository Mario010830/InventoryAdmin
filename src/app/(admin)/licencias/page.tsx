import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import LicenciasTable from "@/components/pesca/LicenciasTable";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Licencias | SILIPE",
  description: "Licencias de pesca emitidas",
};

export default function LicenciasPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Licencias" />
      <LicenciasTable />
    </div>
  );
}
