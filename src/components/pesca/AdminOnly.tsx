"use client";

import { useAuth } from "@/context/AuthContext";
import { isAdministrator } from "@/lib/auth-roles";
import React from "react";

export default function AdminOnly({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isReady } = useAuth();

  if (!isReady) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-gray-500 dark:text-gray-400">
        Cargando…
      </div>
    );
  }

  if (!isAdministrator(user)) {
    return (
      <div className="rounded-2xl border border-warning-200 bg-warning-50 px-6 py-10 text-center dark:border-warning-500/30 dark:bg-warning-500/10">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
          Acceso restringido
        </h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Esta sección solo está disponible para usuarios con rol de administrador.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
