/** Etiquetas de UI para movimientos (listados y cajón de detalle). */

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  "0": "Entrada",
  "1": "Salida",
  "2": "Ajuste",
  "3": "Transferencia",
  entry: "Entrada",
  exit: "Salida",
};

export function movementTypeLabel(type: unknown): string {
  const raw = String(type ?? "");
  const key = raw.toLowerCase();
  return MOVEMENT_TYPE_LABELS[key] ?? MOVEMENT_TYPE_LABELS[raw] ?? raw;
}

export const INVENTORY_MOVEMENT_REASONS: { value: string; label: string }[] = [
  { value: "Compra", label: "Compra" },
  { value: "DevolucionCliente", label: "Devolución cliente" },
  { value: "TransferenciaEntrada", label: "Transferencia entrada" },
  { value: "StockInicial", label: "Stock inicial" },
  { value: "ImportacionExcel", label: "Importación por Excel" },
  { value: "Venta", label: "Venta" },
  { value: "Dano", label: "Daño" },
  { value: "UsoInterno", label: "Uso interno" },
  { value: "DevolucionProveedor", label: "Devolución proveedor" },
  { value: "TransferenciaSalida", label: "Transferencia salida" },
  { value: "Vencimiento", label: "Vencimiento" },
  { value: "ConteoInventario", label: "Conteo inventario" },
  { value: "Correccion", label: "Corrección" },
  { value: "Merma", label: "Merma" },
  { value: "Transferencia", label: "Transferencia" },
  { value: "Muestra", label: "Muestra" },
  { value: "Donacion", label: "Donación" },
  { value: "Otro", label: "Otro" },
];

export const MOVEMENT_REASON_LABEL = Object.fromEntries(
  INVENTORY_MOVEMENT_REASONS.map((r) => [r.value, r.label]),
) as Record<string, string>;

/** Razón fija para movimientos creados desde importación masiva de productos. */
export const IMPORT_EXCEL_MOVEMENT_REASON = "ImportacionExcel" as const;

/** Razón para entradas de stock tras importar desde El Yerro (stock inicial). */
export const IMPORT_ELYERRO_MOVEMENT_REASON = "StockInicial" as const;

export function formatMovementReason(raw: string | null | undefined): string {
  const t = raw?.trim();
  if (!t) return "—";
  return MOVEMENT_REASON_LABEL[t] ?? t;
}
