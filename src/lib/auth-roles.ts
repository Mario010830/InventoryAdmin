/**
 * roleId que la API marca como administrador (si envía número).
 * Si tu backend usa otro valor, define `NEXT_PUBLIC_ADMIN_ROLE_ID` en `.env.local`.
 */
const envRole = process.env.NEXT_PUBLIC_ADMIN_ROLE_ID;
export const ADMIN_ROLE_ID =
  envRole !== undefined && envRole !== "" && !Number.isNaN(Number(envRole))
    ? Number(envRole)
    : 1;

export type AdminCheckUser = {
  roleId?: number | null;
  role?: string | null;
} | null | undefined;

/**
 * Admin si `roleId` coincide con {@link ADMIN_ROLE_ID} o si `role` es claramente administrador
 * (p. ej. login devuelve `"role": "Admin"` sin `roleId`).
 */
export function isAdministrator(user: AdminCheckUser): boolean {
  if (!user) return false;
  if (user.roleId != null && user.roleId === ADMIN_ROLE_ID) return true;
  const label = (user.role ?? "").trim().toLowerCase();
  if (!label) return false;
  return (
    label === "admin" ||
    label === "administrator" ||
    label === "administrador"
  );
}
