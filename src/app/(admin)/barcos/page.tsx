import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import BarcosTable from "@/components/pesca/BarcosTable";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Barcos | SILIPE",
  description: "Registro de embarcaciones",
};

export default function BarcosPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Barcos" />
      <BarcosTable />
    </div>
  );
}
