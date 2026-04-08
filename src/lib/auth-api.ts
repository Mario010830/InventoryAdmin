import { apiPostOk, apiUrl, parseApiResponse } from "./api-client";
import { keysToCamelCase } from "./api-normalize";
import type { AuthUser, LoginResponseBody } from "./auth-types";

function parseBearer(authorization: string | null): string | null {
  if (!authorization) return null;
  const m = authorization.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : authorization.trim() || null;
}

/** Unifica carné desde respuesta API o datos legacy. */
export function normalizeAuthUser(raw: AuthUser): AuthUser {
  const nationalId = raw.nationalId ?? raw.identity ?? null;
  return { ...raw, nationalId };
}

export type LoginResult = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string | null;
};

export async function loginRequest(
  email: string,
  password: string
): Promise<LoginResult> {
  const res = await fetch(apiUrl("account/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const parsed = await parseApiResponse<AuthUser>(res);
  if (!parsed.ok) {
    throw new Error(parsed.message);
  }

  const authHeader =
    res.headers.get("authorization") ?? res.headers.get("Authorization");
  const accessToken = parseBearer(authHeader);
  if (!accessToken) {
    throw new Error(
      "El servidor no devolvió el token de acceso. Comprueba CORS y cabeceras expuestas, o usa el proxy /api-backend."
    );
  }

  const refreshToken =
    res.headers.get("refreshtoken") ??
    res.headers.get("refreshToken") ??
    res.headers.get("RefreshToken");

  const body = parsed.body as LoginResponseBody;
  if (body.result == null) {
    throw new Error("Respuesta sin datos de usuario.");
  }

  return {
    user: normalizeAuthUser(keysToCamelCase(body.result)),
    accessToken,
    refreshToken: refreshToken?.trim() || null,
  };
}

export async function logoutRequest(accessToken: string): Promise<void> {
  await apiPostOk("account/logout", accessToken);
}

export type RefreshTokenResult = {
  accessToken: string;
  refreshToken: string | null;
};

export async function refreshTokenRequest(
  accessToken: string,
  refreshToken: string
): Promise<RefreshTokenResult> {
  const res = await fetch(apiUrl("account/refresh-token"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: accessToken, refreshToken }),
  });

  const parsed = await parseApiResponse<unknown>(res);
  if (!parsed.ok) {
    throw new Error(parsed.message);
  }

  const authHeader =
    res.headers.get("authorization") ?? res.headers.get("Authorization");
  const newAccess = parseBearer(authHeader);
  if (!newAccess) {
    throw new Error("Renovación de sesión sin token de acceso en cabeceras.");
  }

  const newRefresh =
    res.headers.get("refreshtoken") ??
    res.headers.get("refreshToken") ??
    res.headers.get("RefreshToken");

  return {
    accessToken: newAccess,
    refreshToken: newRefresh?.trim() || null,
  };
}
