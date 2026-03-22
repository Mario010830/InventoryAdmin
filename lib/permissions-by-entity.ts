/**
 * Permisos agrupados por entidad para el modal de roles.
 * Cada entidad agrupa por clave (p. ej. "sale", "sale.return", "currency").
 * El código se parsea como: todo salvo el último segmento = entidad; último = operación
 * (ej. sale.return.create → entidad sale.return, op create).
 */

export type PermissionOp = string;

export interface PermissionItem {
  id: number;
  code: string;
  name: string;
  op: PermissionOp;
}

export interface EntityGroup {
  key: string;
  label: string;
  description: string;
  permissions: PermissionItem[];
}

const OP_NAMES: Record<string, string> = {
  read: "Ver",
  create: "Crear",
  update: "Editar",
  delete: "Eliminar",
  manage: "Gestionar",
  cancel: "Cancelar",
  report: "Reportes",
};

/** Último segmento = operación; el resto = clave de entidad (puede incluir puntos). */
export function parsePermissionCode(code: string): { entity: string; op: string } {
  const parts = code.split(".").filter(Boolean);
  if (parts.length === 0) return { entity: "", op: "read" };
  if (parts.length === 1) return { entity: parts[0]!, op: "manage" };
  const op = parts[parts.length - 1]!;
  const entity = parts.slice(0, -1).join(".");
  return { entity, op };
}

/** Nombre legible cuando la API no envía name (evita mostrar "product.create"). */
function friendlyName(code: string, op: string): string {
  const { entity } = parsePermissionCode(code);
  const opLabel = OP_NAMES[op] ?? op;
  const entityLabels: Record<string, string> = {
    product: "Producto",
    productcategory: "Categoría de producto",
    supplier: "Proveedor",
    user: "Usuario",
    role: "Rol",
    location: "Ubicación",
    inventory: "Inventario",
    inventorymovement: "Movimiento de inventario",
    setting: "Configuración",
    log: "Registros de actividad",
    organization: "Organización",
    admin: "Administrador",
    contact: "Contacto",
    lead: "Lead",
    sale: "Venta",
    "sale.return": "Devolución de venta",
    tag: "Etiqueta",
    subscription: "Suscripción",
    plan: "Plan",
    currency: "Moneda",
  };
  const lastSeg = entity.includes(".") ? entity.split(".").pop() ?? entity : entity;
  const entityLabel = entityLabels[entity] ?? entityLabels[lastSeg] ?? lastSeg;
  if (entity === "admin" || lastSeg === "admin") return "Administrador";
  if (op === "read") return `Ver ${entityLabel}${entity === "productcategory" || entity === "inventorymovement" ? "" : "s"}`;
  return `${opLabel} ${entityLabel}`;
}

/** Construye grupos desde una lista de permisos { id, code, name }. */
export function buildEntityGroups(list: { id: number; code: string; name?: string }[]): EntityGroup[] {
  const byEntity = new Map<string, PermissionItem[]>();

  for (const p of list) {
    if (!p.code?.trim()) continue;
    const { entity, op } = parsePermissionCode(p.code);
    const rawName = p.name && p.name.trim() ? p.name : "";
    const name =
      rawName && !rawName.includes(".") && rawName !== p.code ? rawName : friendlyName(p.code, op);
    const item: PermissionItem = { id: p.id, code: p.code, name, op };
    if (!byEntity.has(entity)) byEntity.set(entity, []);
    byEntity.get(entity)!.push(item);
  }

  const ORDER: Record<string, number> = {
    admin: 0,
    product: 1,
    productcategory: 2,
    supplier: 3,
    location: 4,
    inventory: 5,
    inventorymovement: 6,
    user: 7,
    role: 8,
    setting: 9,
    log: 10,
    organization: 11,
    contact: 12,
    lead: 13,
    sale: 14,
    "sale.return": 15,
    tag: 16,
    subscription: 17,
    plan: 18,
    currency: 19,
  };

  const LABELS: Record<string, string> = {
    admin: "Administrador",
    product: "Productos",
    productcategory: "Categorías de producto",
    supplier: "Proveedores",
    location: "Ubicaciones",
    inventory: "Inventario",
    inventorymovement: "Movimientos de inventario",
    user: "Usuarios",
    role: "Roles",
    setting: "Configuración",
    log: "Registros de actividad",
    organization: "Organización",
    contact: "Contactos",
    lead: "Leads",
    sale: "Ventas",
    "sale.return": "Devoluciones de venta",
    tag: "Etiquetas",
    subscription: "Suscripción",
    plan: "Planes",
    currency: "Monedas",
  };

  const DESCRIPTIONS: Record<string, string> = {
    admin: "Acceso total al sistema.",
    product: "Catálogo de productos, precios y stock.",
    productcategory: "Categorías para organizar productos.",
    supplier: "Directorio de proveedores y contactos.",
    location: "Ubicaciones y almacenes.",
    inventory: "Stock por producto y ubicación.",
    inventorymovement: "Entradas, salidas y ajustes de inventario.",
    user: "Usuarios y acceso a la plataforma.",
    role: "Roles y permisos por módulo.",
    setting: "Ajustes generales del sistema.",
    log: "Auditoría y registro de actividades.",
    organization: "Datos de la organización.",
    contact: "Contactos y CRM.",
    lead: "Oportunidades y leads.",
    sale: "Pedidos y ventas.",
    "sale.return": "Devoluciones asociadas a ventas.",
    tag: "Etiquetas para clasificar.",
    subscription: "Suscripción y facturación del tenant.",
    plan: "Planes de producto SaaS.",
    currency: "Monedas y tipos de cambio.",
  };

  const OP_SORT_ORDER = ["read", "create", "update", "delete", "cancel", "report", "manage"];

  const groups: EntityGroup[] = [];
  for (const [entity, perms] of byEntity) {
    const sorted = [...perms].sort((a, b) => {
      const ia = OP_SORT_ORDER.indexOf(a.op);
      const ib = OP_SORT_ORDER.indexOf(b.op);
      if (ia === -1 && ib === -1) return a.op.localeCompare(b.op);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    groups.push({
      key: entity,
      label: LABELS[entity] ?? entity,
      description: DESCRIPTIONS[entity] ?? "",
      permissions: sorted,
    });
  }
  groups.sort((a, b) => (ORDER[a.key] ?? 99) - (ORDER[b.key] ?? 99));
  return groups;
}

/** Obtiene el permiso "read" de un grupo (para el toggle Ver); si no hay, el primero. */
export function getReadPermission(group: EntityGroup): PermissionItem | null {
  return group.permissions.find((p) => p.op === "read") ?? group.permissions[0] ?? null;
}

/** Permisos distintos del que controla el interruptor principal (evita duplicar el mismo id en switch + lista). */
export function getOtherPermissions(group: EntityGroup): PermissionItem[] {
  const primary = getReadPermission(group);
  if (!primary) return [];
  return group.permissions.filter((p) => p.id !== primary.id);
}
