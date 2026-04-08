import { coerceApiSuccessBody, keysToCamelCase } from "./api-normalize";
import type { ApiErrorBody, ApiSuccessBody } from "./api-types";

/** Ruta relativa sin prefijo /api (p. ej. `account/login`, `ships/3`). */
export function apiUrl(path: string): string {
  const p = path.replace(/^\/+/, "");
  if (typeof window !== "undefined") {
    return `/api-backend/${p}`;
  }
  const base =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
    "https://localhost:44384";
  return `${base}/api/${p}`;
}

export async function parseApiResponse<T>(
  res: Response
): Promise<
  | { ok: true; status: number; body: ApiSuccessBody<T> }
  | { ok: false; status: number; message: string }
> {
  const text = await res.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    return {
      ok: false,
      status: res.status,
      message: "Respuesta inválida del servidor.",
    };
  }

  if (!res.ok) {
    const err = data as ApiErrorBody;
    return {
      ok: false,
      status: res.status,
      message: err.message || `Error (${res.status})`,
    };
  }

  const body = coerceApiSuccessBody<T>(data);
  return { ok: true, status: res.status, body };
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

type FetchOptions = RequestInit & {
  accessToken?: string | null;
};

function buildHeaders(init: FetchOptions): Headers {
  const headers = new Headers(init.headers);
  if (
    !headers.has("Content-Type") &&
    init.body &&
    !(init.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }
  if (init.accessToken) {
    headers.set("Authorization", `Bearer ${init.accessToken}`);
  }
  return headers;
}

/**
 * POST/PUT con cuerpo JSON; devuelve `result` del wrapper o lanza ApiRequestError.
 */
export async function apiJson<T>(
  path: string,
  init: FetchOptions = {}
): Promise<T> {
  const { accessToken, ...rest } = init;
  const res = await fetch(apiUrl(path), {
    ...rest,
    headers: buildHeaders({ ...init, accessToken }),
  });
  const parsed = await parseApiResponse<T>(res);
  if (!parsed.ok) {
    throw new ApiRequestError(parsed.message, parsed.status);
  }
  const r = parsed.body.result;
  if (r === undefined) {
    throw new ApiRequestError(
      parsed.body.message || "Respuesta sin datos (result)",
      parsed.status
    );
  }
  return keysToCamelCase(r) as T;
}

/**
 * GET; devuelve `result` (puede ser array).
 */
export async function apiGet<T>(path: string, accessToken: string): Promise<T> {
  return apiJson<T>(path, { method: "GET", accessToken });
}

/** POST que solo exige éxito HTTP (p. ej. logout). */
export async function apiPostOk(
  path: string,
  accessToken: string,
  body?: unknown
): Promise<void> {
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const parsed = await parseApiResponse<unknown>(res);
  if (!parsed.ok) {
    throw new ApiRequestError(parsed.message, parsed.status);
  }
}

export async function apiPost<T>(
  path: string,
  accessToken: string,
  body?: unknown
): Promise<T> {
  return apiJson<T>(path, {
    method: "POST",
    accessToken,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}
