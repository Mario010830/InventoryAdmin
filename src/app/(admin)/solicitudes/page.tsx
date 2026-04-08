import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import SolicitudesTable from "@/components/pesca/SolicitudesTable";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Solicitudes | SILIPE",
  description: "Gestión de solicitudes de licencia",
};

export default function SolicitudesPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Solicitudes" />
      <SolicitudesTable />
    </div>
  );
}
