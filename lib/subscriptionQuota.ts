/**
 * Límites de suscripción (GET /subscription/my-subscription, MySubscriptionDto).
 * `null` = la API no informó el límite (no bloquear en cliente).
 * `-1` = ilimitado explícito.
 */
export function isAtSubscriptionLimit(
  currentCount: number,
  limit: number | null | undefined,
): boolean {
  if (limit == null) return false;
  if (limit < 0) return false;
  if (!Number.isFinite(currentCount) || currentCount < 0) return false;
  return currentCount >= limit;
}

export const PRODUCT_QUOTA_TOOLTIP =
  "Has alcanzado el máximo de productos de tu plan.";

export const LOCATION_QUOTA_TOOLTIP =
  "Has alcanzado el máximo de ubicaciones de tu plan.";
