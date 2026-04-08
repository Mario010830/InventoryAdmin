import type { ApiSuccessBody } from "./api-types";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Convierte claves JSON PascalCase → camelCase (recursivo en objetos y arrays). */
export function keysToCamelCase<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((item) => keysToCamelCase(item)) as T;
  }
  if (!isPlainObject(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) {
    const ck = k.charAt(0).toLowerCase() + k.slice(1);
    out[ck] = keysToCamelCase(v);
  }
  return out as T;
}

/**
 * Unifica formas habituales de respuesta Ok: array crudo, `{ result }`, `{ items }`, `{ data }`, etc.
 */
export function coerceApiSuccessBody<T>(data: unknown): ApiSuccessBody<T> {
  if (Array.isArray(data)) {
    return { statusCode: 200, result: data as T, message: null };
  }
  if (!isPlainObject(data)) {
    return { statusCode: 200, result: data as T, message: null };
  }
  const o = data as Record<string, unknown>;
  if ("result" in o || "Result" in o) {
    const result = (o.result ?? o.Result) as T | null | undefined;
    return {
      statusCode: Number(o.statusCode ?? o.StatusCode) || 200,
      customStatusCode: (o.customStatusCode ?? o.CustomStatusCode) as
        | number
        | undefined,
      message: (o.message ?? o.Message) as string | null,
      result: result === undefined ? (null as T | null) : result,
    };
  }
  const nested =
    o.items ??
    o.Items ??
    o.data ??
    o.Data ??
    o.value ??
    o.Value;
  if (Array.isArray(nested)) {
    return {
      statusCode: Number(o.statusCode ?? o.StatusCode) || 200,
      message: (o.message ?? o.Message) as string | null,
      result: nested as T,
    };
  }
  if (nested !== undefined && nested !== null && !Array.isArray(nested)) {
    return {
      statusCode: Number(o.statusCode ?? o.StatusCode) || 200,
      message: (o.message ?? o.Message) as string | null,
      result: nested as T,
    };
  }
  return {
    statusCode: Number(o.statusCode ?? o.StatusCode) || 200,
    message: (o.message ?? o.Message) as string | null,
    result: undefined,
  };
}
