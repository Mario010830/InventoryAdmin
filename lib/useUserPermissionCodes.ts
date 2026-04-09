"use client";

import { useMemo } from "react";
import { useGetMyRoleQuery } from "@/app/dashboard/roles/_service/rolesApi";
import { PERMISSIONS } from "@/lib/utils";
import { useAppSelector } from "@/store/store";

/**
 * Devuelve los códigos de permiso del usuario actual según su rol.
 * Usa GET /api/role/my-role (rol actual con PermissionIds, sin requerir RoleRead).
 */
export function useUserPermissionCodes(): {
  permissionCodes: Set<string>;
  isLoading: boolean;
  has: (code: string) => boolean;
} {
  const user = useAppSelector((state) => state.auth);
  const { data: role, isLoading } = useGetMyRoleQuery(undefined, {
    skip: !user,
  });

  const permissionCodes = useMemo(() => {
    if (!role?.result) return new Set<string>();
    const ids = role.result.permissionIds ?? [];
    const codes = ids
      .map((id) => PERMISSIONS.find((p) => p.id === id)?.code)
      .filter((c): c is string => !!c);
    return new Set(codes);
  }, [role]);

  const has = useMemo(
    () => (code: string) =>
      permissionCodes.has("admin") || permissionCodes.has(code),
    [permissionCodes],
  );

  return { permissionCodes, isLoading, has };
}
