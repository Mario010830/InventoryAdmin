/** Respuesta de error típica del middleware .NET */
export type ApiErrorBody = {
  statusCode: number;
  customStatusCode?: number;
  message?: string;
};

/** Wrapper JSON en respuestas Ok */
export type ApiSuccessBody<T> = {
  statusCode: number;
  customStatusCode?: number;
  message?: string | null;
  result?: T | null;
};

export const LICENSE_TYPE_VESSEL = 0;
export const LICENSE_TYPE_SHORE = 1;

export type ShipOwnerDto = {
  userId: number;
  fullName: string;
  nationalId: string;
};

/** GET /api/ships/{id} y GET /api/ships (listado; cada ítem incluye `owners`). */
export type ShipDto = {
  id: number;
  name: string;
  registrationNumber: string;
  owners: ShipOwnerDto[];
};

export type LicenseResponseDto = {
  id: number;
  type: number;
  typeName: string;
  issueDate: string;
  expirationDate: string;
  isActive: boolean;
  shipId: number | null;
  userId: number | null;
};

export type CreateShipRequest = {
  name: string;
  registrationNumber: string;
};

export type AddShipOwnerDto = {
  userId: number;
};

/** GET /api/account/users */
export type UserAdminListDto = {
  id: number;
  email: string;
  fullName: string;
  nationalId: string;
  phone: string;
  address: string;
  birthDate: string;
  statusId: number;
  status: string;
  role: string;
  createdAt: string;
  lastLoggedIn: string | null;
};

/** GET /api/admin/solicitudes — placeholder */
export type AdminSolicitudesResult = {
  items: unknown[];
};
