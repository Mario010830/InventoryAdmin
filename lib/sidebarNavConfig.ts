import type { LucideIcon } from "lucide-react";

/** Ítem de navegación principal del dashboard (misma forma que el sidebar). */
export interface SidebarNavItem {
  icon: string;
  label: string;
  route: string;
  permission?: string;
  lucideIcon?: LucideIcon;
}

export const MAIN_SIDEBAR_ITEMS: SidebarNavItem[] = [
  { icon: "dashboard", label: "Dashboard", route: "/dashboard" },
  {
    icon: "inventory_2",
    label: "Productos",
    route: "/dashboard/products",
    permission: "product.read",
  },
  {
    icon: "category",
    label: "Categorías",
    route: "/dashboard/categories",
    permission: "productcategory.read",
  },
  {
    icon: "local_shipping",
    label: "Proveedores",
    route: "/dashboard/suppliers",
    permission: "supplier.read",
  },
  {
    icon: "credit_card",
    label: "Métodos de pago",
    route: "/dashboard/payment-methods",
    permission: "paymentmethod.read",
  },
  {
    icon: "warehouse",
    label: "Ubicaciones",
    route: "/dashboard/locations",
    permission: "location.read",
  },
  {
    icon: "inventory",
    label: "Inventario",
    route: "/dashboard/inventory",
    permission: "inventory.read",
  },
  {
    icon: "swap_horiz",
    label: "Movimientos",
    route: "/dashboard/movements",
    permission: "inventorymovement.read",
  },
  {
    icon: "calculate",
    label: "Cuadre Diario",
    route: "/dashboard/daily-summary",
    permission: "daily_summary.view",
  },
  {
    icon: "contacts",
    label: "Contrapartes",
    route: "/dashboard/contacts",
    permission: "contact.read",
  },
  {
    icon: "person_search",
    label: "Leads",
    route: "/dashboard/leads",
    permission: "lead.read",
  },
  {
    icon: "payments",
    label: "Préstamos",
    route: "/dashboard/loans",
    permission: "loan.read",
  },
  {
    icon: "local_offer",
    label: "Promociones",
    route: "/dashboard/promotions",
    permission: "product.read",
  },
];

export const ADMIN_SIDEBAR_ITEMS: SidebarNavItem[] = [
  {
    icon: "group",
    label: "Usuarios",
    route: "/dashboard/users",
    permission: "user.read",
  },
  {
    icon: "admin_panel_settings",
    label: "Roles",
    route: "/dashboard/roles",
    permission: "role.read",
  },
  {
    icon: "settings",
    label: "Configuración",
    route: "/dashboard/settings",
    permission: "setting.read",
  },
];

/** Entrada principal «Reportes» y subenlaces (mismas rutas que el sidebar). */
/** Ventas: padre + submenú (órdenes, devoluciones, retiro de caja). */
export const SALES_SIDEBAR_PARENT = {
  route: "/dashboard/sales",
  label: "Ventas",
  icon: "point_of_sale" as const,
};

export interface SalesSidebarSection {
  route: string;
  label: string;
  /** Si falta, solo se exige el permiso del padre implícito vía `canSeeSalesSection`. */
  permission?: string;
}

export const SALES_SIDEBAR_SECTIONS: SalesSidebarSection[] = [
  { route: "/dashboard/sales", label: "Órdenes", permission: "sale.read" },
  { route: "/dashboard/sales/returns", label: "Devoluciones", permission: "sale.read" },
  {
    route: "/dashboard/sales/cash-outflow",
    label: "Retiro de caja",
    permission: "daily_summary.view",
  },
];

/** Visibilidad de cada entrada del submenú Ventas (retiro admite ver o crear cuadre). */
export function canSeeSalesSection(
  section: SalesSidebarSection,
  has: (code: string) => boolean,
): boolean {
  if (section.route === "/dashboard/sales/cash-outflow") {
    return has("daily_summary.view") || has("daily_summary.create");
  }
  if (!section.permission) return has("sale.read");
  return has(section.permission);
}

/** Resalta la entrada correcta del submenú Ventas según la ruta actual. */
export function isSalesSidebarSectionActive(
  sectionRoute: string,
  pathname: string,
): boolean {
  if (sectionRoute === "/dashboard/sales/returns") {
    return pathname.startsWith("/dashboard/sales/returns");
  }
  if (sectionRoute === "/dashboard/sales/cash-outflow") {
    return pathname.startsWith("/dashboard/sales/cash-outflow");
  }
  if (sectionRoute === "/dashboard/sales") {
    return (
      pathname === "/dashboard/sales" ||
      (pathname.startsWith("/dashboard/sales") &&
        !pathname.startsWith("/dashboard/sales/returns") &&
        !pathname.startsWith("/dashboard/sales/cash-outflow"))
    );
  }
  return pathname === sectionRoute || pathname.startsWith(`${sectionRoute}/`);
}

export const REPORT_SIDEBAR_PARENT: { route: string; label: string } = {
  route: "/reportes",
  label: "Reportes",
};

export const REPORT_SIDEBAR_SECTIONS: { route: string; label: string }[] = [
  { route: "/reportes/ventas", label: "Ventas" },
  { route: "/reportes/inventario", label: "Inventario" },
  { route: "/reportes/productos", label: "Productos" },
  { route: "/reportes/crm", label: "CRM" },
  { route: "/reportes/operaciones", label: "Operaciones" },
  { route: "/admin/reports/metrics", label: "Métricas" },
];
