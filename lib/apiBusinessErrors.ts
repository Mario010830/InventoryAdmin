/**
 * Códigos de negocio devueltos por la API (customStatusCode) y mensajes para UI.
 * `locale` permite alinear con i18n del cliente (catálogo PWA, formularios).
 */

export const API_CUSTOM_STATUS = {
  /** Ubicación no pertenece a la organización (p. ej. offerLocationIds inválidos). */
  OFFER_LOCATION_IDS_INVALID: 400030,
  /** Producto elaborado no ofertado en la tienda del pedido. */
  ELABORATED_NOT_OFFERED_AT_ORDER_LOCATION: 400044,
  /** Venta ya totalmente devuelta. */
  SALE_FULLY_RETURNED: 400514,
  /** Vínculo stock padre/hijo inválido. */
  STOCK_PARENT_LINK_INVALID: 400515,
  /** Movimiento de inventario en SKU hijo: usar el producto padre. */
  INVENTORY_MOVEMENT_ON_CHILD_SKU: 400516,
  /** No se puede vincular a padre si el producto ya tiene inventario propio. */
  STOCK_PARENT_LINK_OWN_INVENTORY: 400517,
} as const;

export function parseApiErrorPayload(data: unknown): {
  customStatusCode?: number;
  message?: string;
} {
  if (data == null || typeof data !== "object") return {};
  const o = data as Record<string, unknown>;
  const code = o.customStatusCode ?? o.CustomStatusCode;
  const message = o.message ?? o.Message ?? o.title ?? o.Title;
  const n = typeof code === "number" ? code : Number(code);
  return {
    customStatusCode: Number.isFinite(n) ? n : undefined,
    message: typeof message === "string" ? message : undefined,
  };
}

/** Errores de RTK Query / fetchBaseQuery (`{ status, data }`). */
export function extractRtkQueryErrorFields(error: unknown): {
  customStatusCode?: number;
  message?: string;
} {
  if (error && typeof error === "object" && "data" in error) {
    return parseApiErrorPayload((error as { data: unknown }).data);
  }
  return {};
}

const MESSAGES_ES: Record<number, string> = {
  [API_CUSTOM_STATUS.OFFER_LOCATION_IDS_INVALID]:
    "Una o más tiendas no pertenecen a tu organización. Revisa las ubicaciones seleccionadas.",
  [API_CUSTOM_STATUS.ELABORATED_NOT_OFFERED_AT_ORDER_LOCATION]:
    "Este producto elaborado no está disponible en la tienda elegida. Cambia de tienda o quita el producto del pedido.",
  [API_CUSTOM_STATUS.SALE_FULLY_RETURNED]:
    "Esta venta ya fue devuelta por completo. No se puede volver a confirmar, cancelar ni devolver.",
  [API_CUSTOM_STATUS.STOCK_PARENT_LINK_INVALID]:
    "La relación de stock con el producto padre no es válida. Revisa producto padre y factor.",
  [API_CUSTOM_STATUS.INVENTORY_MOVEMENT_ON_CHILD_SKU]:
    "Este producto toma stock de otro SKU. Registra entradas, salidas o ajustes sobre el producto padre (bulto), no sobre la unidad de venta.",
  [API_CUSTOM_STATUS.STOCK_PARENT_LINK_OWN_INVENTORY]:
    "No se puede vincular a un producto padre mientras este SKU tenga inventario propio registrado.",
};

const MESSAGES_EN: Record<number, string> = {
  [API_CUSTOM_STATUS.OFFER_LOCATION_IDS_INVALID]:
    "One or more stores do not belong to your organization. Check the selected locations.",
  [API_CUSTOM_STATUS.ELABORATED_NOT_OFFERED_AT_ORDER_LOCATION]:
    "This prepared product is not offered at the selected store. Switch stores or remove the item from your order.",
  [API_CUSTOM_STATUS.SALE_FULLY_RETURNED]:
    "This sale has already been fully returned. It cannot be confirmed, cancelled, or returned again.",
  [API_CUSTOM_STATUS.STOCK_PARENT_LINK_INVALID]:
    "The parent/child stock link is invalid. Check the parent product and factor.",
  [API_CUSTOM_STATUS.INVENTORY_MOVEMENT_ON_CHILD_SKU]:
    "This SKU draws stock from another product. Record movements on the parent (bulk) SKU, not on the sale unit.",
  [API_CUSTOM_STATUS.STOCK_PARENT_LINK_OWN_INVENTORY]:
    "Cannot link to a parent while this SKU still has its own on-hand inventory.",
};

export function userFacingBusinessErrorMessage(
  customStatusCode: number | undefined,
  serverMessage: string | undefined,
  locale: "es" | "en" = "es",
): string {
  if (customStatusCode != null) {
    const table = locale === "en" ? MESSAGES_EN : MESSAGES_ES;
    const byCode = table[customStatusCode];
    if (byCode) return byCode;
  }
  if (serverMessage?.trim()) return serverMessage.trim();
  return locale === "en" ? "Something went wrong." : "Ocurrió un error.";
}

/** Locale breve para catálogo / PWA sin next-intl. */
export function catalogUiLocale(): "es" | "en" {
  if (typeof navigator === "undefined") return "es";
  return navigator.language.toLowerCase().startsWith("en") ? "en" : "es";
}
