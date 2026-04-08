import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import SolicitudDetalleView from "@/components/pesca/SolicitudDetalleView";
import { getSolicitudById } from "@/data/mock-solicitudes";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import React from "react";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const n = Number(id);
  const s = getSolicitudById(n);
  return {
    title: s ? `Solicitud #${s.id} | SILIPE` : "Solicitud | SILIPE",
  };
}

export default async function SolicitudDetallePage({ params }: Props) {
  const { id } = await params;
  const n = Number(id);
  if (Number.isNaN(n)) notFound();
  const solicitud = getSolicitudById(n);
  if (!solicitud) notFound();

  return (
    <div>
      <PageBreadcrumb pageTitle={`Solicitud #${solicitud.id}`} />
      <SolicitudDetalleView initial={solicitud} />
    </div>
  );
}
