"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { LayoutGrid } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { clearSession } from "@/lib/auth-api";
import { useUserPermissionCodes } from "@/lib/useUserPermissionCodes";
import { removeAuthCookie } from "../login/_service/sessionCookie";
import "./dashboard.css";
import { useAppSelector, useAppDispatch } from "@/store/store";
import { useLogoutMutation } from "../login/_service/authApi";
import { logoutSuccessfull } from "../login/_slices/authSlice";
import { SETTINGS_SECTIONS } from "./settings/settingsNav";
import { TopbarCurrencySelector } from "@/components/TopbarCurrencySelector";

interface NavItem {
  icon: string;
  label: string;
  route: string;
  /** Permission code required to see this link (e.g. "product.read"). Omit for Dashboard (visible to all). */
  permission?: string;
  /** Si está definido, se muestra este icono de Lucide en lugar del Material del campo `icon`. */
  lucideIcon?: LucideIcon;
}

const navItems: NavItem[] = [
  { icon: "dashboard", label: "Dashboard", route: "/dashboard" },
  { icon: "inventory_2", label: "Productos", route: "/dashboard/products", permission: "product.read" },
  { icon: "category", label: "Categorías", route: "/dashboard/categories", permission: "productcategory.read" },
  { icon: "local_shipping", label: "Proveedores", route: "/dashboard/suppliers", permission: "supplier.read" },
  { icon: "warehouse", label: "Ubicaciones", route: "/dashboard/locations", permission: "location.read" },
  { icon: "inventory", label: "Inventario", route: "/dashboard/inventory", permission: "inventory.read" },
  { icon: "swap_horiz", label: "Movimientos", route: "/dashboard/movements", permission: "inventorymovement.read" },
  { icon: "point_of_sale", label: "Ventas", route: "/dashboard/sales", permission: "sale.read" },
];

const adminItems: NavItem[] = [
  { icon: "group", label: "Usuarios", route: "/dashboard/users", permission: "user.read" },
  { icon: "admin_panel_settings", label: "Roles", route: "/dashboard/roles", permission: "role.read" },
  { icon: "receipt_long", label: "Logs", route: "/dashboard/logs", permission: "log.read" },
  {
    icon: "grid_view",
    label: "Categorías de negocio",
    route: "/dashboard/business-categories",
    permission: "setting.read",
    lucideIcon: LayoutGrid,
  },
  { icon: "settings", label: "Configuración", route: "/dashboard/settings", permission: "setting.read" },
];

function SidebarNavIcon({ item }: { item: NavItem }) {
  const L = item.lucideIcon;
  if (L) {
    return <L className="nav-item-lucide" size={19} strokeWidth={1.75} aria-hidden />;
  }
  return <Icon name={item.icon} />;
}

function BrandIcon() {
  return (
    <img src="/assets/logo-claro-nobg.png" alt="Strova Logo" className="brand-logo" height={32} />
  );
}

function DashboardSettingsNavItem({
  collapsed,
  label,
  icon,
}: {
  collapsed: boolean;
  label: string;
  icon: string;
}) {
  const pathname = usePathname();
  const expanded = pathname.startsWith("/dashboard/settings");
  const [hash, setHash] = useState("");
  useEffect(() => {
    const sync = () => setHash(typeof window !== "undefined" ? window.location.hash.slice(1) : "");
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const isActive = pathname.startsWith("/dashboard/settings");
  return (
    <div className="nav-expandable">
      <Link href="/dashboard/settings" className={`nav-item ${isActive ? "active" : ""}`}>
        <Icon name={icon} />
        {!collapsed && <span>{label}</span>}
      </Link>
      {!collapsed && expanded && (
        <div className="nav-sub" role="group" aria-label="Secciones de configuración">
          {SETTINGS_SECTIONS.map((s) => (
            <Link
              key={s.id}
              href={`/dashboard/settings#${s.id}`}
              className={`nav-sub-item ${hash === s.id ? "nav-sub-item--active" : ""}`}
            >
              <span className="nav-sub-dot" aria-hidden />
              <span>{s.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardLayout({
  children,
}: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const user = useAppSelector((state) => state.auth) || null;
  const { has: hasPermission } = useUserPermissionCodes();

  const dispatch = useAppDispatch();
  const [logout] = useLogoutMutation();

  const visibleNavItems = useMemo(
    () =>
      navItems.filter(
        (item) => !item.permission || hasPermission(item.permission)
      ),
    [hasPermission]
  );
  const visibleAdminItems = useMemo(
    () =>
      adminItems.filter(
        (item) => !item.permission || hasPermission(item.permission)
      ),
    [hasPermission]
  );

  const isActive = (route: string) => {
    if (route === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(route);
  };

  const handleLogout = () => {
    logout();
    dispatch(logoutSuccessfull());
    clearSession();
    removeAuthCookie();
    router.push("/login");
  };

  const initial = user ? user.fullName.charAt(0).toUpperCase() : "?";

  return (
    <div className={`dashboard ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
        <div className="sidebar-brand">
          <Link href="/dashboard" className="brand">
            <div className="brand-icon">
              <BrandIcon />
            </div>
            {!collapsed && (
              <span className="brand-text">
                Strova
              </span>
            )}
          </Link>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group">
            {!collapsed && <div className="nav-group-label">MENÚ</div>}
            {visibleNavItems.map((item) => (
              <Link
                key={item.route}
                href={item.route}
                className={`nav-item ${isActive(item.route) ? "active" : ""}`}
              >
                <SidebarNavIcon item={item} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </div>
          <div className="nav-group">
            {!collapsed && visibleAdminItems.length > 0 && <div className="nav-group-label">ADMIN</div>}
            {visibleAdminItems.map((item) =>
              item.route === "/dashboard/settings" ? (
                <DashboardSettingsNavItem
                  key={item.route}
                  collapsed={collapsed}
                  label={item.label}
                  icon={item.icon}
                />
              ) : (
                <Link
                  key={item.route}
                  href={item.route}
                  className={`nav-item ${isActive(item.route) ? "active" : ""}`}
                >
                  <SidebarNavIcon item={item} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              )
            )}
          </div>
        </nav>

        <div className="sidebar-bottom">
          {!collapsed && (
            <div className="sidebar-user">
              <div className="sidebar-user-avatar">{initial}</div>
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{user?.fullName || "Usuario"}</span>
                <span className="sidebar-user-role">{user?.location?.name || user?.organization?.name || "Sin ubicación"}</span>
              </div>
            </div>
          )}
          <button
            type="button"
            className="nav-item nav-item--danger"
            onClick={handleLogout}
          >
            <Icon name="logout" />
            {!collapsed && <span>Salir</span>}
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="topbar-toggle"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? "Abrir menú" : "Cerrar menú"}
            >
              <Icon name={collapsed ? "menu_open" : "menu"} />
            </button>
          </div>
          <div className="topbar-right">
            <TopbarCurrencySelector />
            <button type="button" className="topbar-icon-btn" aria-label="Notificaciones">
              <Icon name="notifications_none" />
            </button>
            <button type="button" className="topbar-icon-btn" aria-label="Mensajes">
              <Icon name="mail_outline"/>
            </button>
          </div>
        </header>

        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
