"use client";

import Label from "@/components/form/Label";
import TextArea from "@/components/form/input/TextArea";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import { Modal } from "@/components/ui/modal";
import { useModal } from "@/hooks/useModal";
import {
  badgeColorDocumento,
  badgeColorEstadoSolicitud,
  badgeColorPago,
  labelEstadoDocumento,
  labelEstadoSolicitud,
  labelPagoEstado,
  labelTipoLicencia,
} from "@/lib/pesca-labels";
import type { EstadoSolicitud, Solicitud } from "@/types/solicitud";
import Link from "next/link";
import React, { useState } from "react";

type Props = { initial: Solicitud };

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-CU", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function SolicitudDetalleView({ initial }: Props) {
  const [s, setS] = useState<Solicitud>(initial);
  const modalAprobar = useModal();
  const modalRechazar = useModal();
  const modalInfo = useModal();
  const [textoObs, setTextoObs] = useState("");
  const [textoInfo, setTextoInfo] = useState("");

  const puedeGestionar =
    s.estado === "Pendiente" || s.estado === "EnRevision";

  const aplicarEstado = (
    estado: EstadoSolicitud,
    observacion?: string
  ) => {
    setS((prev) => ({
      ...prev,
      estado,
      fechaResolucion: new Date().toISOString(),
      observacionGestor: observacion ?? prev.observacionGestor,
    }));
  };

  const onAprobar = () => {
    aplicarEstado("Aprobada");
    modalAprobar.closeModal();
  };

  const onRechazar = () => {
    aplicarEstado("Rechazada", textoObs.trim() || undefined);
    setTextoObs("");
    modalRechazar.closeModal();
  };

  const onInfoAdicional = () => {
    aplicarEstado("InfoAdicional", textoInfo.trim() || undefined);
    setTextoInfo("");
    modalInfo.closeModal();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/solicitudes"
          className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
        >
          ← Volver a solicitudes
        </Link>
        <Badge size="sm" color={badgeColorEstadoSolicitud(s.estado)}>
          {labelEstadoSolicitud(s.estado)}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
            Solicitante
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 dark:text-gray-400">Nombre</dt>
              <dd className="text-end font-medium text-gray-800 dark:text-white/90">
                {s.usuario.nombre}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 dark:text-gray-400">Carnet</dt>
              <dd className="text-end text-gray-800 dark:text-white/90">
                {s.usuario.carnet}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 dark:text-gray-400">Email</dt>
              <dd className="text-end text-gray-800 dark:text-white/90">
                {s.usuario.email}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
            Solicitud
          </h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 dark:text-gray-400">Tipo</dt>
              <dd className="text-end text-gray-800 dark:text-white/90">
                {labelTipoLicencia(s.tipo)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500 dark:text-gray-400">Fecha solicitud</dt>
              <dd className="text-end text-gray-800 dark:text-white/90">
                {fmt(s.fechaSolicitud)}
              </dd>
            </div>
            {s.fechaResolucion && (
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500 dark:text-gray-400">Resolución</dt>
                <dd className="text-end text-gray-800 dark:text-white/90">
                  {fmt(s.fechaResolucion)}
                </dd>
              </div>
            )}
            {s.observacionGestor && (
              <div className="pt-2">
                <dt className="text-gray-500 dark:text-gray-400">
                  Observación del gestor
                </dt>
                <dd className="mt-1 text-gray-800 dark:text-white/90">
                  {s.observacionGestor}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {s.embarcacion && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
            Embarcación
          </h3>
          <dl className="flex flex-wrap gap-6 text-sm">
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Nombre</dt>
              <dd className="font-medium text-gray-800 dark:text-white/90">
                {s.embarcacion.nombre}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Identidad</dt>
              <dd className="text-gray-800 dark:text-white/90">
                {s.embarcacion.identidad}
              </dd>
            </div>
          </dl>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
          Documentos
        </h3>
        {s.documentos.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Sin documentos adjuntos.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-white/[0.06]">
            {s.documentos.map((d) => (
              <li
                key={d.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-gray-800 dark:text-white/90">
                    {d.nombreArchivo}
                  </span>
                  <Badge size="sm" color={badgeColorDocumento(d.estado)}>
                    {labelEstadoDocumento(d.estado)}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      window.alert(
                        `Vista previa (mock): ${d.rutaArchivo}`
                      )
                    }
                  >
                    Ver
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      window.alert(`Descarga simulada: ${d.nombreArchivo}`)
                    }
                  >
                    Descargar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
          Pago
        </h3>
        {!s.pago ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Sin registro de pago.
          </p>
        ) : (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Monto</dt>
              <dd className="font-medium text-gray-800 dark:text-white/90">
                {s.pago.monto} CUP
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Pasarela</dt>
              <dd className="text-gray-800 dark:text-white/90">
                {s.pago.pasarela}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Estado</dt>
              <dd>
                <Badge size="sm" color={badgeColorPago(s.pago.estado)}>
                  {labelPagoEstado(s.pago.estado)}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">
                ID transacción
              </dt>
              <dd className="font-mono text-xs text-gray-800 dark:text-white/90">
                {s.pago.transaccionId}
              </dd>
            </div>
          </dl>
        )}
      </div>

      {puedeGestionar && (
        <div className="flex flex-wrap gap-3 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <Button size="sm" onClick={modalAprobar.openModal}>
            Aprobar
          </Button>
          <Button size="sm" variant="outline" onClick={modalRechazar.openModal}>
            Rechazar
          </Button>
          <Button size="sm" variant="outline" onClick={modalInfo.openModal}>
            Solicitar información adicional
          </Button>
        </div>
      )}

      <Modal
        isOpen={modalAprobar.isOpen}
        onClose={modalAprobar.closeModal}
        className="max-w-md p-6"
      >
        <h4 className="font-semibold text-gray-800 dark:text-white/90">
          ¿Aprobar solicitud?
        </h4>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Se marcará la solicitud como aprobada (solo en esta sesión, datos
          estáticos).
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button size="sm" variant="outline" onClick={modalAprobar.closeModal}>
            Cancelar
          </Button>
          <Button size="sm" onClick={onAprobar}>
            Confirmar
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={modalRechazar.isOpen}
        onClose={modalRechazar.closeModal}
        className="max-w-lg p-6"
      >
        <h4 className="font-semibold text-gray-800 dark:text-white/90">
          Rechazar solicitud
        </h4>
        <div className="mt-4">
          <Label>Observación</Label>
          <TextArea
            rows={4}
            value={textoObs}
            onChange={setTextoObs}
            placeholder="Motivo del rechazo…"
          />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button size="sm" variant="outline" onClick={modalRechazar.closeModal}>
            Cancelar
          </Button>
          <Button size="sm" onClick={onRechazar}>
            Rechazar
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={modalInfo.isOpen}
        onClose={modalInfo.closeModal}
        className="max-w-lg p-6"
      >
        <h4 className="font-semibold text-gray-800 dark:text-white/90">
          Solicitar información adicional
        </h4>
        <div className="mt-4">
          <Label>Indique qué documentación falta o debe corregirse</Label>
          <TextArea
            rows={4}
            value={textoInfo}
            onChange={setTextoInfo}
            placeholder="Detalle para el solicitante…"
          />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button size="sm" variant="outline" onClick={modalInfo.closeModal}>
            Cancelar
          </Button>
          <Button size="sm" onClick={onInfoAdicional}>
            Enviar
          </Button>
        </div>
      </Modal>
    </div>
  );
}
