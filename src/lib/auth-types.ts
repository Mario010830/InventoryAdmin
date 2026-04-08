/** Usuario devuelto en `result` del login (`UserResponse` API). */
export type AuthUser = {
  id: number;
  birthDate?: string | null;
  fullName: string | null;
  /** Carné / documento (API: `nationalId`) */
  nationalId?: string | null;
  email: string | null;
  phone?: string | null;
  statusId?: number;
  status?: string | null;
  lastLoggedIn?: string | null;
  /** @deprecated Usar `nationalId`; se mantiene por datos antiguos en localStorage */
  identity?: string | null;
  /** Texto de rol en login (ej. `"Admin"`); se usa si no hay `roleId`. */
  role?: string | null;
  /** Si el backend envía id numérico de rol para administración */
  roleId?: number | null;
  genderId?: number;
  gender?: string | null;
  locationId?: number | null;
  organizationId?: number | null;
  location?: unknown;
  organization?: unknown;
};

export type LoginResponseBody = {
  result: AuthUser;
  statusCode?: number;
  customStatusCode?: number;
  message?: string | null;
};
