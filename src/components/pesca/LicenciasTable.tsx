"use client";

import Badge from "@/components/ui/badge/Badge";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { DataTable } from "@/components/pesca/data-table";
import { useAuth } from "@/context/AuthContext";
import { getAdminLicenses } from "@/lib/admin-api";
import { isAdministrator } from "@/lib/auth-roles";
import { getUserLicenses } from "@/lib/licenses-api";
import { labelTipoLicencia } from "@/lib/pesca-labels";
import {
  mapLicenseDtoToLicencia,
} from "@/lib/map-pesca-api";
import { getShip } from "@/lib/ships-api";
import type { Licencia } from "@/types/licencia";
import type { TipoLicencia } from "@/types/solicitud";
import type { ColumnDef } from "@tanstack/react-table";
import React, { useCallback, useEffect, useMemo, useState } from "react";

const TIPOS: TipoLicencia[] = [
  "PescaOrilla",
  "EmbarcacionDeportiva",
  "EmbarcacionEstatal",
  "EmbarcacionComercial",
];

function vigente(lic: Licencia): boolean {
  const fin = new Date(lic.fechaVencimiento);
  fin.setHours(23, 59, 59, 999);
  const hoy = new Date();
  return lic.activa && fin >= hoy;
}

function displayTipo(lic: Licencia): string {
  return lic.tipoDisplay ?? labelTipoLicencia(lic.tipo);
}

export default function LicenciasTable() {
  const { token, user, isReady } = useAuth();
  const [rows, setRows] = useState<Licencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tipoFiltro, setTipoFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<"" | "vigente" | "vencida">(
    ""
  );
  const [busqueda, setBusqueda] = useState("");

  const adminView = isAdministrator(user);

  const load = useCallback(async () => {
    if (!token || !user) {
      setRows([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const dtos = adminView
        ? await getAdminLicenses(token)
        : await getUserLicenses(token, user.id);
      let mapped = dtos.map((d) =>
        mapLicenseDtoToLicencia(d, adminView ? null : user)
      );

      const shipIds = [
        ...new Set(dtos.map((d) => d.shipId).filter((id): id is number => id != null)),
      ];
      if (shipIds.length > 0) {
        const ships = await Promise.all(
          shipIds.map(async (id) => {
            try {
              return { id, ship: await getShip(token, id) };
            } catch {
              return { id, ship: null };
            }
          })
        );
        const byId = new Map(ships.filter((s) => s.ship).map((s) => [s.id, s.ship!]));
        mapped = mapped.map((lic) => {
          const sid = lic.embarcacion?.identidad
            ? Number(lic.embarcacion.identidad)
            : NaN;
          const ship = Number.isFinite(sid) ? byId.get(sid) : undefined;
          if (!ship) return lic;
          return {
            ...lic,
            embarcacion: {
              nombre: ship.name,
              identidad: ship.registrationNumber,
            },
          };
        });
      }

      setRows(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar las licencias.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token, user, adminView]);

  useEffect(() => {
    if (!isReady) return;
    void load();
  }, [isReady, load]);

  const filtered = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return rows.filter((lic) => {
      if (tipoFiltro && lic.tipo !== tipoFiltro) return false;
      const v = vigente(lic);
      if (estadoFiltro === "vigente" && !v) return false;
      if (estadoFiltro === "vencida" && v) return false;
      if (q) {
        const cod = lic.codigoUnico.toLowerCase();
        const nom = lic.usuario?.nombre?.toLowerCase() ?? "";
        const carn = lic.usuario?.carnet?.toLowerCase() ?? "";
        const emb = lic.embarcacion?.nombre?.toLowerCase() ?? "";
        const uid =
          lic.userId != null ? String(lic.userId).toLowerCase() : "";
        const sid =
          lic.shipId != null ? String(lic.shipId).toLowerCase() : "";
        if (
          !cod.includes(q) &&
          !nom.includes(q) &&
          !carn.includes(q) &&
          !emb.includes(q) &&
          !uid.includes(q) &&
          !sid.includes(q)
        )
          return false;
      }
      return true;
    });
  }, [rows, tipoFiltro, estadoFiltro, busqueda]);

  const columns = useMemo<ColumnDef<Licencia>[]>(
    () => [
      {
        accessorKey: "codigoUnico",
        header: "Código",
        cell: ({ getValue }) => (
          <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
            {getValue() as string}
          </span>
        ),
      },
      {
        id: "tipoCol",
        header: "Tipo",
        cell: ({ row }) => (
          <span className="text-theme-sm text-gray-600 dark:text-gray-300">
            {displayTipo(row.original)}
          </span>
        ),
      },
      {
        accessorKey: "usuario",
        header: "Titular",
        cell: ({ row }) => {
          const u = row.original.usuario;
          if (!u)
            return (
              <span className="text-gray-400 text-theme-sm">—</span>
            );
          return (
            <div>
              <span className="block text-theme-sm font-medium text-gray-800 dark:text-white/90">
                {u.nombre}
              </span>
              <span className="block text-theme-xs text-gray-500">
                {u.carnet}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "embarcacion",
        header: "Embarcación",
        cell: ({ row }) => {
          const e = row.original.embarcacion;
          if (!e) return <span className="text-gray-400 text-theme-sm">—</span>;
          return (
            <span className="text-theme-sm text-gray-600 dark:text-gray-300">
              {e.nombre} ({e.identidad})
            </span>
          );
        },
      },
      {
        accessorKey: "fechaEmision",
        header: "Emisión",
        cell: ({ getValue }) => (
          <span className="text-theme-sm text-gray-600 dark:text-gray-300">
            {getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: "fechaVencimiento",
        header: "Vencimiento",
        cell: ({ getValue }) => (
          <span className="text-theme-sm text-gray-600 dark:text-gray-300">
            {getValue() as string}
          </span>
        ),
      },
      {
        id: "estadoLic",
        header: "Estado",
        cell: ({ row }) => {
          const ok = vigente(row.original);
          return (
            <Badge size="sm" color={ok ? "success" : "error"}>
              {ok ? "Vigente" : "Vencida / inactiva"}
            </Badge>
          );
        },
      },
    ],
    []
  );

  const toolbar = (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.03] lg:flex-row lg:flex-wrap lg:items-end">
      <div className="min-w-[180px] flex-1">
        <Label>Tipo</Label>
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
      <div className="min-w-[180px] flex-1">
        <Label>Estado</Label>
        <select
          className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          value={estadoFiltro}
          onChange={(e) =>
            setEstadoFiltro(e.target.value as "" | "vigente" | "vencida")
          }
        >
          <option value="">Todos</option>
          <option value="vigente">Vigente</option>
          <option value="vencida">Vencida / inactiva</option>
        </select>
      </div>
      <div className="min-w-[220px] flex-[2]">
        <Label>Buscar</Label>
        <Input
          placeholder={
            adminView
              ? "Código, titular, id usuario, id embarcación…"
              : "Código, titular, embarcación…"
          }
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>
      {token && user ? (
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="h-11 rounded-lg border border-gray-300 bg-white px-4 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/5"
          >
            Actualizar
          </button>
        </div>
      ) : null}
    </div>
  );

  if (!isReady) {
    return (
      <p className="text-theme-sm text-gray-500 dark:text-gray-400">
        Cargando sesión…
      </p>
    );
  }

  if (!token || !user) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-theme-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
        Inicie sesión para ver las licencias asociadas a su cuenta (API:
        licencias por usuario).
      </p>
    );
  }

  if (loading && rows.length === 0) {
    return (
      <>
        {adminView ? (
          <p className="mb-3 text-theme-xs text-gray-500 dark:text-gray-400">
            Vista administrador:{" "}
            <code className="rounded bg-gray-100 px-1 dark:bg-white/10">
              GET /api/licenses
            </code>
          </p>
        ) : null}
        {toolbar}
        <p className="mt-4 text-theme-sm text-gray-500 dark:text-gray-400">
          Cargando licencias…
        </p>
      </>
    );
  }

  if (error) {
    return (
      <>
        {toolbar}
        <p className="mt-4 text-theme-sm text-error-600 dark:text-error-500">
          {error}
        </p>
      </>
    );
  }

  return (
    <>
      {adminView ? (
        <p className="mb-3 text-theme-xs text-gray-500 dark:text-gray-400">
          Vista administrador:{" "}
          <code className="rounded bg-gray-100 px-1 dark:bg-white/10">
            GET /api/licenses
          </code>
        </p>
      ) : null}
      <DataTable<Licencia>
      data={filtered}
      columns={columns}
      toolbar={toolbar}
      messageEmpty="No hay licencias que coincidan."
    />
    </>
  );
}
