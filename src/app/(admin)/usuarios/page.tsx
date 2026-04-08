import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AdminOnly from "@/components/pesca/AdminOnly";
import UsuariosInternosPanel from "@/components/pesca/UsuariosInternosPanel";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Usuarios internos | SILIPE",
  description: "Gestores e inspectores",
};

export default function UsuariosPage() {
  return (
    <div>
      <PageBreadcrumb pageTitle="Usuarios internos" />
      <AdminOnly>
        <UsuariosInternosPanel />
      </AdminOnly>
    </div>
  );
}
