import { apiGet, apiPost } from "./api-client";
import type {
  AddShipOwnerDto,
  CreateShipRequest,
  LicenseResponseDto,
  ShipDto,
} from "./api-types";

export function getShip(
  accessToken: string,
  shipId: number
): Promise<ShipDto> {
  return apiGet<ShipDto>(`ships/${shipId}`, accessToken);
}

export function createShip(
  accessToken: string,
  body: CreateShipRequest
): Promise<ShipDto> {
  return apiPost<ShipDto>("ships", accessToken, body);
}

export function addShipOwner(
  accessToken: string,
  shipId: number,
  body: AddShipOwnerDto
): Promise<unknown> {
  return apiPost<unknown>(`ships/${shipId}/owners`, accessToken, body);
}

/** Licencia activa del buque o error si 404. */
export function getShipActiveLicense(
  accessToken: string,
  shipId: number
): Promise<LicenseResponseDto> {
  return apiGet<LicenseResponseDto>(`ships/${shipId}/license`, accessToken);
}
