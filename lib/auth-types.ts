import type { BusinessHoursDto } from "./dashboard-types";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignUpRequest {
  fullName: string;
  email: string;
  password: string;
  confirmationPassword: string;
  birthday: string;
  gender: number;
  phone?: string;
  organizationId?: number;
}

export interface CreateOrganizationRequest {
  name: string;
  code: string;
}

export type RegistrationBillingCycle = "monthly" | "annual";

export interface RegisterWithOrganizationRequest {
  organizationName: string;
  organizationCode: string;
  fullName: string;
  email: string;
  password: string;
  confirmationPassword: string;
  birthday: string;
  phone: string;
  gender: number | null;
  planId: number;
  billingCycle: RegistrationBillingCycle;
}

export interface UserResponse {
  id: number;
  birthDate: string;
  fullName: string;
  identity: string;
  genderId: number;
  gender: string;
  email: string;
  phone: string;
  statusId: number;
  status: string;
  locationId?: number;
  organizationId?: number;
  roleId?: number;
  location?: LocationResponse;
  organization?: {
    id: number;
    name: string;
    code: string;
    description?: string;
    createdAt: string;
    modifiedAt: string;
  };
}
export interface LoginResponse {
  result: UserResponse;
  statusCode: number;
  customStatusCode: number;
}

export interface OrganizationResponse {
  result: {
    id: number;
    name: string;
    code: string;
    description?: string;
    createdAt: string;
    modifiedAt: string;
  };
  statusCode: number;
  customStatusCode: number;
}

export interface LocationResponse {
  id: number;
  organizationId: number;
  organizationName?: string;
  name: string;
  code: string;
  description?: string;
  whatsAppContact?: string | null;
  photoUrl?: string | null;
  province?: string | null;
  municipality?: string | null;
  street?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  /** Alternativa enviada por el backend: coordenadas en objeto */
  coordinates?: { lat: number; lng: number } | null;
  /** Categoría de negocio (GET /business-category); opcional */
  businessCategoryId?: number | null;
  businessCategoryName?: string | null;
  /** Horario general (GET admin) */
  businessHours?: BusinessHoursDto | null;
  offersDelivery?: boolean;
  offersPickup?: boolean;
  createdAt: string;
  modifiedAt: string;
}

export interface ApiResponse<T> {
  result: T;
  customStatusCode: number;
  statusCode: number;
}
