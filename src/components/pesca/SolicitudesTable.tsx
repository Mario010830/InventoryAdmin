"use client";

import Badge from "@/components/ui/badge/Badge";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { DataTable, SortableColumnHeader } from "@/components/pesca/data-table";
import { useAuth } from "@/context/AuthContext";
import { mockSolicitudes } from "@/data/mock-solicitudes";
import { getAdminSolicitudes } from "@/lib/admin-api";
import { isAdministrator } from "@/lib/auth-roles";
import {
  badgeColorEstadoSolicitud,
  labelEstadoSolicitud,
  labelTipoLicencia,
} from "@/lib/pesca-labels";
import type { EstadoSolicitud, Solicitud, TipoLicencia } from "@/types/solicitud";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";

const ESTADOS: EstadoSolicitud[] = [
  "Pendiente",
  "EnRevision",
  "Aprobada",
  "Rechazada",
  "InfoAdicional",
];

const TIPOS: TipoLicencia[] = [
  "PescaOrilla",
  "EmbarcacionDeportiva",
  "EmbarcacionEstatal",
  "EmbarcacionComercial",
];

function formatFecha(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("es-CU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function SolicitudesTable() {
  const { token, user, isReady } = useAuth();
  const [estadoFiltro, setEstadoFiltro] = useState<string>("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [adminRows, setAdminRows] = useState<Solicitud[]>([]);
  const [adminLoaded, setAdminLoaded] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  const adminUser = isAdministrator(user);

  useEffect(() => {
    if (!isReady || !token || !adminUser) {
      setAdminRows([]);
      setAdminLoaded(false);
      setAdminError(null);
      return;
    }
    let cancelled = false;
    setAdminLoaded(false);
    setAdminError(null);
    void getAdminSolicitudes(token)
      .then((r) => {
        if (cancelled) return;
        const items = Array.isArray(r.items) ? r.items : [];
        setAdminRows(items as Solicitud[]);
        setAdminLoaded(true);
      })
      .catch((e) => {
        if (cancelled) return;
        setAdminError(
          e instanceof Error ? e.message : "No se pudieron cargar las solicitudes."
        );
        setAdminRows([]);
        setAdminLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isReady, token, adminUser]);

  const sourceRows = adminUser ? adminRows : mockSolicitudes;

  const filtered = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return sourceRows.filter((s) => {
      if (estadoFiltro && s.estado !== estadoFiltro) return false;
      if (tipoFiltro && s.tipo !== tipoFiltro) return false;
      const fs = new Date(s.fechaSolicitud);
      if (fechaDesde) {
        const d = new Date(fechaDesde);
        d.setHours(0, 0, 0, 0);
        if (fs < d) return false;
      }
      if (fechaHasta) {
        const h = new Date(fechaHasta);
        h.setHours(23, 59, 59, 999);
        if (fs > h) return false;
      }
      if (q) {
        const nombre = s.usuario?.nombre?.toLowerCase() ?? "";
        const carnet = s.usuario?.carnet?.toLowerCase() ?? "";
        if (!nombre.includes(q) && !carnet.includes(q)) return false;
      }
      return true;
    });
  }, [
    sourceRows,
    estadoFiltro,
    tipoFiltro,
    fechaDesde,
    fechaHasta,
    busqueda,
  ]);

  const columns = useMemo<ColumnDef<Solicitud>[]>(
    () => [
      {
        accessorKey: "usuario.nombre",
        id: "solicitante",
        header: ({ column }) => (
          <SortableColumnHeader column={column}>
            Solicitante
          </SortableColumnHeader>
        ),
        cell: ({ row }) => (
          <div>
            <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
              {row.original.usuario.nombre}
            </span>
            <span className="block text-theme-xs text-gray-500 dark:text-gray-400">
              {row.original.usuario.email}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "usuario.carnet",
        header: "Carnet",
        cell: ({ getValue }) => (
          <span className="text-theme-sm text-gray-600 dark:text-gray-300">
            {getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: "tipo",
        header: "Tipo licencia",
        cell: ({ getValue }) => (
          <span className="text-theme-sm text-gray-600 dark:text-gray-300">
            {labelTipoLicencia(getValue() as TipoLicencia)}
          </span>
        ),
      },
      {
        accessorKey: "estado",
        header: "Estado",
        cell: ({ getValue }) => {
          const e = getValue() as EstadoSolicitud;
          return (
            <Badge size="sm" color={badgeColorEstadoSolicitud(e)}>
              {labelEstadoSolicitud(e)}
            </Badge>
          );
        },
      },
      {
        accessorKey: "fechaSolicitud",
        header: ({ column }) => (
          <SortableColumnHeader column={column}>Fecha</SortableColumnHeader>
        ),
        cell: ({ getValue }) => (
          <span className="text-theme-sm text-gray-600 dark:text-gray-300">
            {formatFecha(getValue() as string)}
          </span>
        ),
      },
      {
        id: "acciones",
        header: "Acciones",
        cell: ({ row }) => (
          <Link
            href={`/solicitudes/${row.original.id}`}
            className="inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300"
          >
            Ver detalle
          </Link>
        ),
      },
    ],
    []
  );

  const toolbar = (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.03] lg:flex-row lg:flex-wrap lg:items-end">
      <div className="min-w-[160px] flex-1">
        <Label>Estado</Label>
        <select
          className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          value={estadoFiltro}
          onChange={(e) => setEstadoFiltro(e.target.value)}
        >
          <option value="">Todos</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {labelEstadoSolicitud(e)}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-[180px] flex-1">
        <Label>Tipo de licencia</Label>
        <select
          className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          value={tipoFiltro}
          onChange={(e) => setTipoFiltro(e.target.value)}
        >
          <option value="">Todos</option>
          {TIPOS.map((t) => (
            <option key={t} value={t}>
              {labelTipoLicencia(t)}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-[140px]">
        <Label>Desde</Label>
        <Input
          type="date"
          value={fechaDesde}
          onChange={(e) => setFechaDesde(e.target.value)}
        />
      </div>
      <div className="min-w-[140px]">
        <Label>Hasta</Label>
        <Input
          type="date"
          value={fechaHasta}
          onChange={(e) => setFechaHasta(e.target.value)}
        />
      </div>
      <div className="min-w-[200px] flex-[2]">
        <Label>Buscar</Label>
        <div className="relative">
          <Input
            placeholder="Nombre o carnet…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-10"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg
              width="18"
              height="18"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M3.04199 9.37363C3.04199 5.87693 5.87735 3.04199 9.37533 3.04199C12.8733 3.04199 15.7087 5.87693 15.7087 9.37363C15.7087 12.8703 12.8733 15.7053 9.37533 15.7053C5.87735 15.7053 3.04199 12.8703 3.04199 9.37363ZM9.37533 1.54199C5.04926 1.54199 1.54199 5.04817 1.54199 9.37363C1.54199 13.6991 5.04926 17.2053 9.37533 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4709 18.5319 17.9458 18.5319 18.2397 18.238C18.5336 17.9441 18.5336 17.4693 18.2397 17.1754L15.4187 14.3543C16.5365 13.0003 17.2087 11.2639 17.2087 9.37363C17.2087 5.04817 13.7014 1.54199 9.37533 1.54199Z"
                fill="currentColor"
              />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );

  if (adminUser && !adminLoaded) {
    return (
      <p className="text-theme-sm text-gray-500 dark:text-gray-400">
        Cargando solicitudes (admin)…
      </p>
    );
  }

  if (adminUser && adminError) {
    return (
      <p className="text-theme-sm text-error-600 dark:text-error-500">
        {adminError}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {adminUser && adminLoaded ? (
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
          Vista administrador:{" "}
          <code className="rounded bg-gray-100 px-1 dark:bg-white/10">
            GET /api/admin/solicitudes
          </code>
          {adminRows.length === 0
            ? " — `items` vacío (placeholder hasta existir entidad)."
            : null}
        </p>
      ) : null}
      <DataTable<Solicitud>
        data={filtered}
        columns={columns}
        toolbar={toolbar}
        messageEmpty={
          adminUser && adminRows.length === 0
            ? "Sin solicitudes en el servidor (placeholder API)."
            : "No hay solicitudes que coincidan con los filtros."
        }
      />
    </div>
  );
}
