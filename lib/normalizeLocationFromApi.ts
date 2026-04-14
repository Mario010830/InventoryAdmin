import type { LocationResponse } from "@/lib/auth-types";

/**
 * El API .NET puede serializar en PascalCase. Unifica flags de modalidad de entrega
 * para que el dashboard (tabla, formulario de edición) use siempre camelCase.
 */
export function normalizeLocationFromApi(
  row: LocationResponse,
): LocationResponse {
  const r = row as unknown as Record<string, unknown>;
  const rawDelivery = r.offersDelivery ?? r.OffersDelivery;
  const rawPickup = r.offersPickup ?? r.OffersPickup;

  const toBool = (v: unknown): boolean | undefined => {
    if (v === undefined || v === null) return undefined;
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v !== 0;
    if (typeof v === "string") {
      const s = v.trim().toLowerCase();
      if (s === "true" || s === "1") return true;
      if (s === "false" || s === "0") return false;
    }
    return undefined;
  };

  return {
    ...row,
    offersDelivery: toBool(rawDelivery),
    offersPickup: toBool(rawPickup),
  };
}
