import { apiGet, apiPost } from "./api-client";
import type { LicenseResponseDto } from "./api-types";

export function issueShipLicense(
  accessToken: string,
  shipId: number
): Promise<LicenseResponseDto> {
  return apiPost<LicenseResponseDto>(`licenses/ship/${shipId}`, accessToken);
}

export function getShipLicenseHistory(
  accessToken: string,
  shipId: number
): Promise<LicenseResponseDto[]> {
  return apiGet<LicenseResponseDto[]>(`licenses/ship/${shipId}`, accessToken);
}

export function issueShoreLicense(
  accessToken: string,
  userId: number
): Promise<LicenseResponseDto> {
  return apiPost<LicenseResponseDto>(`licenses/shore/${userId}`, accessToken);
}

export async function getUserLicenses(
  accessToken: string,
  userId: number
): Promise<LicenseResponseDto[]> {
  const raw = await apiGet<LicenseResponseDto[] | null>(
    `licenses/user/${userId}`,
    accessToken
  );
  return raw ?? [];
}
