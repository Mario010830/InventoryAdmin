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
    icon: "point_of_sale",
    label: "Ventas",
    route: "/dashboard/sales",
    permission: "sale.read",
  },
  {
    icon: "calculate",
    label: "Cuadre Diario",
    route: "/dashboard/daily-summary",
    permission: "daily_summary.view",
  },
  {
    icon: "contacts",
    label: "Contactos",
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
