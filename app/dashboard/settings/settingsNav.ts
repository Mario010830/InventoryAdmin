/** Anclas y subnavegación lateral de Configuración (`/dashboard/settings#...`). */
export const SETTINGS_SECTIONS = [
  { id: "inventario", label: "Inventario", icon: "inventory_2" },
  { id: "monedas", label: "Monedas y tipo de cambio", icon: "attach_money" },
  { id: "notificaciones", label: "Notificaciones", icon: "notifications" },
  { id: "seguridad", label: "Seguridad", icon: "shield" },
  { id: "perfil", label: "Perfil de cuenta", icon: "person" },
  { id: "vista-movil", label: "Vista en móvil", icon: "view_list" },
  { id: "sidebar", label: "Barra lateral", icon: "view_column" },
  { id: "suscripcion", label: "Suscripción", icon: "credit_card" },
] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]["id"];
