import { apiGet } from "./api-client";
import type {
  AdminSolicitudesResult,
  LicenseResponseDto,
  ShipDto,
  UserAdminListDto,
} from "./api-types";

/** Tras login (admin): GET /api/account/users */
export function getAdminUsers(accessToken: string): Promise<UserAdminListDto[]> {
  return apiGet<UserAdminListDto[]>("account/users", accessToken);
}

/** Tras login (admin): GET /api/ships → `result` es array de buques con `owners`. */
export function getAdminShips(accessToken: string): Promise<ShipDto[]> {
  return apiGet<ShipDto[]>("ships", accessToken);
}

/** Tras login (admin): GET /api/licenses */
export function getAdminLicenses(
  accessToken: string
): Promise<LicenseResponseDto[]> {
  return apiGet<LicenseResponseDto[]>("licenses", accessToken);
}

export function getAdminSolicitudes(
  accessToken: string
): Promise<AdminSolicitudesResult> {
  return apiGet<AdminSolicitudesResult>("admin/solicitudes", accessToken);
}
