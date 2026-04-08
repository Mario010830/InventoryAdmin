"use client";

import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { DataTable } from "@/components/pesca/data-table";
import { useAuth } from "@/context/AuthContext";
import { getAdminShips } from "@/lib/admin-api";
import { isAdministrator } from "@/lib/auth-roles";
import { getUserLicenses } from "@/lib/licenses-api";
import { mapShipDtoToBarco } from "@/lib/map-pesca-api";
import { getShip } from "@/lib/ships-api";
import type { Barco } from "@/types/barco";
import type { ColumnDef } from "@tanstack/react-table";
import React, { useCallback, useEffect, useMemo, useState } from "react";

export default function BarcosTable() {
  const { token, user, isReady } = useAuth();
  const [rows, setRows] = useState<Barco[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      if (adminView) {
        const ships = await getAdminShips(token);
        setRows((ships ?? []).map(mapShipDtoToBarco));
        return;
      }

      const licenses = await getUserLicenses(token, user.id);
      const shipIds = [
        ...new Set(
          licenses.map((l) => l.shipId).filter((id): id is number => id != null)
        ),
      ];
      if (shipIds.length === 0) {
        setRows([]);
        return;
      }
      const results = await Promise.all(
        shipIds.map(async (id) => {
          try {
            return await getShip(token, id);
          } catch {
            return null;
          }
        })
      );
      const barcos = results
        .filter((s): s is NonNullable<typeof s> => s != null)
        .map(mapShipDtoToBarco);
      setRows(barcos);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudieron cargar las embarcaciones."
      );
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
    if (!q) return rows;
    return rows.filter(
      (b) =>
        b.nombre.toLowerCase().includes(q) ||
        b.identidad.toLowerCase().includes(q) ||
        b.matricula.toLowerCase().includes(q) ||
        b.propietario.toLowerCase().includes(q)
    );
  }, [rows, busqueda]);

  const columns = useMemo<ColumnDef<Barco>[]>(
    () => [
      {
        accessorKey: "nombre",
        header: "Nombre",
        cell: ({ getValue }) => (
          <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
            {getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: "identidad",
        header: "Identidad / matrícula",
      },
      {
        accessorKey: "matricula",
        header: "Registro",
      },
      {
        accessorKey: "tipo",
        header: "Tipo",
      },
      {
        accessorKey: "propietario",
        header: "Propietario(s)",
      },
      {
        accessorKey: "puertoBase",
        header: "Puerto base",
      },
    ],
    []
  );

  const toolbar = (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/[0.05] dark:bg-white/[0.03] sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-md flex-1">
        <Label>Buscar</Label>
        <Input
          placeholder="Nombre, matrícula o propietario…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="mt-1"
        />
      </div>
      {token && user ? (
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="h-11 shrink-0 rounded-lg border border-gray-300 bg-white px-4 text-theme-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/5"
        >
          Actualizar
        </button>
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
        Inicie sesión para ver las embarcaciones deducidas de sus licencias de
        buque (no hay listado global en la API actual).
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
              GET /api/ships
            </code>
          </p>
        ) : null}
        {toolbar}
        <p className="mt-4 text-theme-sm text-gray-500 dark:text-gray-400">
          Cargando embarcaciones…
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
            GET /api/ships
          </code>
        </p>
      ) : null}
      <DataTable<Barco>
        data={filtered}
        columns={columns}
        toolbar={toolbar}
        messageEmpty={
          adminView
            ? "No hay embarcaciones en el listado administrativo."
            : "No tiene embarcaciones vinculadas por licencia, o aún no hay datos."
        }
        bodyCellClassName="px-5 py-4 text-start text-theme-sm text-gray-600 dark:text-gray-300 sm:px-6"
      />
    </>
  );
}
