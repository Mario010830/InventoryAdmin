import { logoutSuccessfull } from "@/app/login/_slices/authSlice";
import type {
  LoginRequest,
  CreateOrganizationRequest,
  RegisterWithOrganizationRequest,
  UserResponse,
  OrganizationResponse,
  ApiResponse,
} from "./auth-types";

const BACKEND_URL = "https://unequivocally-shrinelike-zara.ngrok-free.dev/api";

/** URL base de la API.
 * Usamos siempre la URL remota (NEXT_PUBLIC_API_URL o BACKEND_URL),
 * tanto en desarrollo como en producción (Vercel).
 */
export function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? BACKEND_URL;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function saveToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("token", token.replace("Bearer ", ""));
}

export function saveRefreshToken(refreshToken: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("refreshToken", refreshToken);
}

export function saveUser(user: UserResponse): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("user", JSON.stringify(user));
}

/** User saved in localStorage (same shape as login result). Used to restore session after reload. */
export function getStoredUser(): UserResponse | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw) as UserResponse;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  logoutSuccessfull();
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
}

export async function login(
  credentials: LoginRequest
): Promise<{ user: UserResponse }> {
  console.log(getApiUrl())
  const res = await fetch(`${getApiUrl()}/account/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify(credentials),
  });

  const token = res.headers.get("Authorization");
  const refreshToken = res.headers.get("RefreshToken");
  if (token) saveToken(token);
  if (refreshToken) saveRefreshToken(refreshToken);

  const json = (await res.json()) as ApiResponse<UserResponse> & { result?: UserResponse };
  if (!res.ok) {
    const msg = (res.status === 401 ? "Email o contraseña incorrectos." : "Error al iniciar sesión.");
    throw new Error(msg);
  }
  const user = json.result;
  if (user) {
    saveUser(user);
    return { user };
  }
  throw new Error("Respuesta inválida del servidor.");
}

export async function register(body: {
  FullName: string;
  Email: string;
  Password: string;
  ConfirmationPassword: string;
  Birthday: string;
  Gender: number;
  Phone?: string;
  OrganizationId?: number;
}): Promise<void> {
  const res = await fetch(`${getApiUrl()}/account/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message ?? "Error al registrar.");
  }
}

export async function createOrganization(
  data: CreateOrganizationRequest
): Promise<OrganizationResponse> {
  const token = getToken();
  const res = await fetch(`${getApiUrl()}/organization`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify({ Name: data.name, Code: data.code }),
  });
  const json = (await res.json()) as ApiResponse<OrganizationResponse>;
  if (!res.ok) {
    throw new Error("Error al crear la organización.");
  }
  return (json as unknown as OrganizationResponse);
}

export async function registerWithOrganization(
  body: RegisterWithOrganizationRequest,
  options?: { skipAutoLogin?: boolean }
): Promise<{ user: UserResponse } | void> {
  const res = await fetch(`${getApiUrl()}/account/register-with-organization`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message ?? "Error al registrar.");
  }
  if (options?.skipAutoLogin) return;
  return login({ email: body.email, password: body.password });
}
