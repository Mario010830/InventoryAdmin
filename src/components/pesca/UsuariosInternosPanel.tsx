"use client";

import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { getAdminUsers } from "@/lib/admin-api";
import type { UserAdminListDto } from "@/lib/api-types";
import React, { useCallback, useEffect, useMemo, useState } from "react";

function formatFecha(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-CU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function UsuariosInternosPanel() {
  const { token, isReady } = useAuth();
  const [rows, setRows] = useState<UserAdminListDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getAdminUsers(token);
      setRows(data ?? []);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudieron cargar los usuarios."
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!isReady || !token) return;
    void load();
  }, [isReady, token, load]);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [rows]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Listado desde{" "}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-theme-xs dark:bg-white/10">
            GET /api/account/users
          </code>{" "}
          (solo lectura).
        </p>
        <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
          {loading ? "Actualizando…" : "Actualizar"}
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-error-600 dark:text-error-500">{error}</p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Nombre
                </TableCell>
                <TableCell
                  isHeader
                  className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Email
                </TableCell>
                <TableCell
                  isHeader
                  className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Carnet
                </TableCell>
                <TableCell
                  isHeader
                  className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Teléfono
                </TableCell>
                <TableCell
                  isHeader
                  className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Dirección
                </TableCell>
                <TableCell
                  isHeader
                  className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Nacimiento
                </TableCell>
                <TableCell
                  isHeader
                  className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Estado
                </TableCell>
                <TableCell
                  isHeader
                  className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Rol
                </TableCell>
                <TableCell
                  isHeader
                  className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Alta
                </TableCell>
                <TableCell
                  isHeader
                  className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Último acceso
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {loading && sorted.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    Cargando usuarios…
                  </TableCell>
                </TableRow>
              ) : sorted.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    No hay usuarios en la respuesta.
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="max-w-[160px] truncate px-4 py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">
                      {u.fullName}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">
                      {u.email}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">
                      {u.nationalId || "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">
                      {u.phone || "—"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">
                      {u.address || "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">
                      {formatFecha(u.birthDate)}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge size="sm" color="light">
                        {u.status || String(u.statusId)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge size="sm" color="primary">
                        {u.role || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3 text-theme-xs text-gray-600 dark:text-gray-300">
                      {formatFecha(u.createdAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-4 py-3 text-theme-xs text-gray-600 dark:text-gray-300">
                      {formatFecha(u.lastLoggedIn)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
