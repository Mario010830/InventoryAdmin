"use client";

import type { LucideIcon } from "lucide-react";
import { BarChart2, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  type ReactNode,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { removeAuthCookie } from "@/app/login/_service/sessionCookie";
import { Icon } from "@/components/ui/Icon";
import { clearSession } from "@/lib/auth-api";
import { useUserPermissionCodes } from "@/lib/useUserPermissionCodes";
import "@/app/dashboard/dashboard.css";
import { SETTINGS_SECTIONS } from "@/app/dashboard/settings/settingsNav";
import { useLogoutMutation } from "@/app/login/_service/authApi";
import { logoutSuccessfull } from "@/app/login/_slices/authSlice";
import { TopbarCurrencySelector } from "@/components/TopbarCurrencySelector";
import { useAppDispatch, useAppSelector } from "@/store/store";

const MOBILE_NAV_MAX_PX = 768;

function subscribeMobileNav(mq: MediaQueryList, onChange: () => void) {
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function useIsMobileNav(maxWidth = MOBILE_NAV_MAX_PX) {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mq =
        typeof window !== "undefined"
          ? window.matchMedia(`(max-width: ${maxWidth}px)`)
          : null;
      if (!mq) return () => {};
      return subscribeMobileNav(mq, onStoreChange);
    },
    () => window.matchMedia(`(max-width: ${maxWidth}px)`).matches,
    () => false,
  );
}

interface NavItem {
  icon: string;
  label: string;
  route: string;
  permission?: string;
  lucideIcon?: LucideIcon;
}

const navItems: NavItem[] = [
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
    icon: "local_offer",
    label: "Promociones",
    route: "/dashboard/promotions",
    permission: "product.read",
  },
];

const adminItems: NavItem[] = [
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
    icon: "receipt_long",
    label: "Logs",
    route: "/dashboard/logs",
    permission: "log.read",
  },
  {
    icon: "grid_view",
    label: "Categorías de negocio",
    route: "/dashboard/business-categories",
    permission: "setting.read",
    lucideIcon: LayoutGrid,
  },
  {
    icon: "settings",
    label: "Configuración",
    route: "/dashboard/settings",
    permission: "setting.read",
  },
];

const REPORT_SECTIONS: { route: string; label: string }[] = [
  { route: "/reportes/ventas", label: "Ventas" },
  { route: "/reportes/inventario", label: "Inventario" },
  { route: "/reportes/productos", label: "Productos" },
  { route: "/reportes/crm", label: "CRM" },
  { route: "/reportes/operaciones", label: "Operaciones" },
];

function SidebarNavIcon({ item }: { item: NavItem }) {
  const L = item.lucideIcon;
  if (L) {
    return (
      <L className="nav-item-lucide" size={19} strokeWidth={1.75} aria-hidden />
    );
  }
  return <Icon name={item.icon} />;
}

function BrandIcon() {
  return (
    // biome-ignore lint/performance/noImgElement: mismo patrón que el layout del dashboard (logo estático)
    <img
      src="/assets/logo-claro-nobg.png"
      alt="Strova Logo"
      className="brand-logo"
      height={32}
    />
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
    const sync = () =>
      setHash(
        typeof window !== "undefined" ? window.location.hash.slice(1) : "",
      );
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const isActive = pathname.startsWith("/dashboard/settings");
  return (
    <div className="nav-expandable">
      <Link
        href="/dashboard/settings"
        className={`nav-item ${isActive ? "active" : ""}`}
      >
        <Icon name={icon} />
        {!collapsed && <span>{label}</span>}
      </Link>
      {!collapsed && expanded && (
        <nav className="nav-sub" aria-label="Secciones de configuración">
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
        </nav>
      )}
    </div>
  );
}

function ReportsNavItem({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const expanded = pathname.startsWith("/reportes");
  const parentActive = pathname.startsWith("/reportes");
  return (
    <div className="nav-expandable">
      <Link
        href="/reportes"
        className={`nav-item ${parentActive ? "active" : ""}`}
      >
        <BarChart2
          className="nav-item-lucide"
          size={19}
          strokeWidth={1.75}
          aria-hidden
        />
        {!collapsed && <span>Reportes</span>}
      </Link>
      {!collapsed && expanded && (
        <nav className="nav-sub" aria-label="Submenú de reportes">
          {REPORT_SECTIONS.map((s) => (
            <Link
              key={s.route}
              href={s.route}
              className={`nav-sub-item ${pathname === s.route ? "nav-sub-item--active" : ""}`}
            >
              <span className="nav-sub-dot" aria-hidden />
              <span>{s.label}</span>
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isMobileNav = useIsMobileNav();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const user = useAppSelector((state) => state.auth) || null;
  const { has: hasPermission } = useUserPermissionCodes();

  const dispatch = useAppDispatch();
  const [logout] = useLogoutMutation();

  const visibleNavItems = useMemo(
    () =>
      navItems.filter(
        (item) => !item.permission || hasPermission(item.permission),
      ),
    [hasPermission],
  );
  const visibleAdminItems = useMemo(
    () =>
      adminItems.filter(
        (item) => !item.permission || hasPermission(item.permission),
      ),
    [hasPermission],
  );

  const isActive = (route: string) => {
    if (route === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(route);
  };

  const handleLogout = async () => {
    try {
      await logout().unwrap();
    } catch {
      /* La API puede fallar; igual limpiamos sesión local */
    }
    dispatch(logoutSuccessfull());
    clearSession();
    removeAuthCookie();
    router.push("/login");
  };

  const initial = user ? user.fullName.charAt(0).toUpperCase() : "?";

  const showNavText = isMobileNav || !collapsed;

  // biome-ignore lint/correctness/useExhaustiveDependencies: al navegar se cierra el menú móvil
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileNav || !mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobileNav, mobileNavOpen]);

  useEffect(() => {
    if (!isMobileNav || !mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMobileNav, mobileNavOpen]);

  const toggleSidebar = () => {
    if (isMobileNav) setMobileNavOpen((o) => !o);
    else setCollapsed((c) => !c);
  };

  return (
    <div
      className={`dashboard ${!isMobileNav && collapsed ? "sidebar-collapsed" : ""} ${isMobileNav && mobileNavOpen ? "dashboard--nav-open" : ""}`}
    >
      {isMobileNav && mobileNavOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Cerrar menú"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <aside
        className={`sidebar ${!isMobileNav && collapsed ? "collapsed" : ""} ${isMobileNav && mobileNavOpen ? "sidebar--open" : ""}`}
      >
        <div className="sidebar-brand">
          <Link href="/dashboard" className="brand">
            <div className="brand-icon">
              <BrandIcon />
            </div>
            {showNavText && <span className="brand-text">Strova</span>}
          </Link>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group">
            {showNavText && <div className="nav-group-label">MENÚ</div>}
            {visibleNavItems.map((item) => (
              <Link
                key={item.route}
                href={item.route}
                className={`nav-item ${isActive(item.route) ? "active" : ""}`}
              >
                <SidebarNavIcon item={item} />
                {showNavText && <span>{item.label}</span>}
              </Link>
            ))}
          </div>
          <div className="nav-group">
            {showNavText && <div className="nav-group-label">REPORTES</div>}
            <ReportsNavItem collapsed={!showNavText} />
          </div>
          <div className="nav-group">
            {showNavText && visibleAdminItems.length > 0 && (
              <div className="nav-group-label">ADMIN</div>
            )}
            {visibleAdminItems.map((item) =>
              item.route === "/dashboard/settings" ? (
                <DashboardSettingsNavItem
                  key={item.route}
                  collapsed={!showNavText}
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
                  {showNavText && <span>{item.label}</span>}
                </Link>
              ),
            )}
          </div>
        </nav>

        <div className="sidebar-bottom">
          {showNavText && (
            <div className="sidebar-user">
              <div className="sidebar-user-avatar">{initial}</div>
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">
                  {user?.fullName || "Usuario"}
                </span>
                <span className="sidebar-user-role">
                  {user?.location?.name ||
                    user?.organization?.name ||
                    "Sin ubicación"}
                </span>
              </div>
            </div>
          )}
          <button
            type="button"
            className="nav-item nav-item--danger"
            onClick={() => void handleLogout()}
          >
            <Icon name="logout" />
            {showNavText && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="topbar-toggle"
              onClick={toggleSidebar}
              aria-expanded={isMobileNav ? mobileNavOpen : !collapsed}
              aria-label={
                isMobileNav
                  ? mobileNavOpen
                    ? "Cerrar menú"
                    : "Abrir menú"
                  : collapsed
                    ? "Expandir barra lateral"
                    : "Contraer barra lateral"
              }
            >
              <Icon
                name={
                  isMobileNav
                    ? mobileNavOpen
                      ? "close"
                      : "menu"
                    : collapsed
                      ? "menu_open"
                      : "menu"
                }
              />
            </button>
          </div>
          <div className="topbar-right">
            <TopbarCurrencySelector />
            <button
              type="button"
              className="topbar-icon-btn"
              aria-label="Notificaciones"
            >
              <Icon name="notifications_none" />
            </button>
            <button
              type="button"
              className="topbar-icon-btn"
              aria-label="Mensajes"
            >
              <Icon name="mail_outline" />
            </button>
          </div>
        </header>

        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
