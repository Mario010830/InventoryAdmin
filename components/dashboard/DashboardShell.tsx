"use client";

import { BarChart2, MessageCircle } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Fragment,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { removeAuthCookie } from "@/app/login/_service/sessionCookie";
import { Icon } from "@/components/ui/Icon";
import { clearSession } from "@/lib/auth-api";
import {
  ADMIN_SIDEBAR_ITEMS,
  MAIN_SIDEBAR_ITEMS,
  REPORT_SIDEBAR_PARENT,
  REPORT_SIDEBAR_SECTIONS,
  SALES_SIDEBAR_PARENT,
  SALES_SIDEBAR_SECTIONS,
  canSeeSalesSection,
  isSalesSidebarSectionActive,
  type SidebarNavItem,
} from "@/lib/sidebarNavConfig";
import { useHiddenSidebarRoutes } from "@/lib/sidebarVisibility";
import { useUserPermissionCodes } from "@/lib/useUserPermissionCodes";
import "@/app/dashboard/dashboard.css";
import { SETTINGS_SECTIONS } from "@/app/dashboard/settings/settingsNav";
import { useLogoutMutation } from "@/app/login/_service/authApi";
import { logoutSuccessfull } from "@/app/login/_slices/authSlice";
import { MobileListLayoutOnboardingModal } from "@/components/MobileListLayoutOnboardingModal";
import { ChatWidget } from "@/components/ChatWidget";
import {
  dismissMobileListLayoutOnboarding,
  setMobileListLayout,
  shouldShowLayoutOnboarding,
  type MobileListLayoutValue,
} from "@/lib/mobileListLayout";
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

function SidebarNavIcon({ item }: { item: SidebarNavItem }) {
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
      src="/assets/logocuadre.PNG?v=2"
      alt="Tu Cuadre Logo"
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

function SalesNavItem({
  collapsed,
  salesSubSections,
}: {
  collapsed: boolean;
  salesSubSections: { route: string; label: string }[];
}) {
  const pathname = usePathname();
  const inSales = pathname.startsWith("/dashboard/sales");
  const expanded = inSales;
  const parentActive = inSales;
  return (
    <div className="nav-expandable">
      <Link
        href={SALES_SIDEBAR_PARENT.route}
        className={`nav-item ${parentActive ? "active" : ""}`}
      >
        <Icon name={SALES_SIDEBAR_PARENT.icon} />
        {!collapsed && <span>{SALES_SIDEBAR_PARENT.label}</span>}
      </Link>
      {!collapsed && expanded && salesSubSections.length > 0 && (
        <nav className="nav-sub" aria-label="Submenú de ventas">
          {salesSubSections.map((s) => (
            <Link
              key={s.route}
              href={s.route}
              className={`nav-sub-item ${isSalesSidebarSectionActive(s.route, pathname) ? "nav-sub-item--active" : ""}`}
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

function ReportsNavItem({
  collapsed,
  reportSubSections,
}: {
  collapsed: boolean;
  reportSubSections: { route: string; label: string }[];
}) {
  const pathname = usePathname();
  const inReports =
    pathname.startsWith("/reportes") || pathname.startsWith("/admin/reports");
  const expanded = inReports;
  const parentActive = inReports;
  return (
    <div className="nav-expandable">
      <Link
        href={REPORT_SIDEBAR_PARENT.route}
        className={`nav-item ${parentActive ? "active" : ""}`}
      >
        <BarChart2
          className="nav-item-lucide"
          size={19}
          strokeWidth={1.75}
          aria-hidden
        />
        {!collapsed && <span>{REPORT_SIDEBAR_PARENT.label}</span>}
      </Link>
      {!collapsed && expanded && reportSubSections.length > 0 && (
        <nav className="nav-sub" aria-label="Submenú de reportes">
          {reportSubSections.map((s) => (
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
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [manualChatOpen, setManualChatOpen] = useState(false);
  const [mobileListOnboardingOpen, setMobileListOnboardingOpen] =
    useState(false);
  const user = useAppSelector((state) => state.auth) || null;
  const { has: hasPermission } = useUserPermissionCodes();
  const hiddenSidebarRoutes = useHiddenSidebarRoutes();

  const dispatch = useAppDispatch();
  const [logout] = useLogoutMutation();

  useEffect(() => {
    if (!isMobileNav) {
      setMobileListOnboardingOpen(false);
      return;
    }
    if (shouldShowLayoutOnboarding()) setMobileListOnboardingOpen(true);
  }, [isMobileNav]);

  const visibleReportSubSections = useMemo(
    () =>
      REPORT_SIDEBAR_SECTIONS.filter(
        (s) => !hiddenSidebarRoutes.includes(s.route),
      ),
    [hiddenSidebarRoutes],
  );

  const showReportsBlock = useMemo(
    () => !hiddenSidebarRoutes.includes(REPORT_SIDEBAR_PARENT.route),
    [hiddenSidebarRoutes],
  );

  const visibleSalesSubSections = useMemo(
    () =>
      SALES_SIDEBAR_SECTIONS.filter((s) => canSeeSalesSection(s, hasPermission))
        .filter((s) => !hiddenSidebarRoutes.includes(s.route))
        .map((s) => ({ route: s.route, label: s.label })),
    [hasPermission, hiddenSidebarRoutes],
  );

  const showSalesBlock = useMemo(() => {
    if (hiddenSidebarRoutes.includes(SALES_SIDEBAR_PARENT.route)) return false;
    return visibleSalesSubSections.length > 0;
  }, [hiddenSidebarRoutes, visibleSalesSubSections]);

  const visibleNavItems = useMemo(() => {
    const allowed = MAIN_SIDEBAR_ITEMS.filter(
      (item) => !item.permission || hasPermission(item.permission),
    );
    return allowed.filter((item) => !hiddenSidebarRoutes.includes(item.route));
  }, [hasPermission, hiddenSidebarRoutes]);

  const salesInsertBeforeDaily = useMemo(
    () =>
      visibleNavItems.findIndex((i) => i.route === "/dashboard/daily-summary"),
    [visibleNavItems],
  );

  const visibleAdminItems = useMemo(() => {
    const allowed = ADMIN_SIDEBAR_ITEMS.filter(
      (item) => !item.permission || hasPermission(item.permission),
    );
    return allowed.filter((item) => !hiddenSidebarRoutes.includes(item.route));
  }, [hasPermission, hiddenSidebarRoutes]);

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

  const desktopExpanded = !collapsed || hoverExpanded;
  const showNavText = isMobileNav || desktopExpanded;

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
    else {
      setCollapsed((c) => !c);
      setHoverExpanded(false);
    }
  };

  return (
    <div
      className={`dashboard ${!isMobileNav && collapsed && !hoverExpanded ? "sidebar-collapsed" : ""} ${isMobileNav && mobileNavOpen ? "dashboard--nav-open" : ""}`}
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
        className={`sidebar ${!isMobileNav && collapsed && !hoverExpanded ? "collapsed" : ""} ${isMobileNav && mobileNavOpen ? "sidebar--open" : ""}`}
        onMouseEnter={() => {
          if (!isMobileNav && collapsed) setHoverExpanded(true);
        }}
        onMouseLeave={() => {
          if (!isMobileNav) setHoverExpanded(false);
        }}
      >
        <div className="sidebar-brand">
          <Link href="/dashboard" className="brand">
            <div className="brand-icon">
              <BrandIcon />
            </div>
            {showNavText && <span className="brand-text">Tu Cuadre</span>}
          </Link>
        </div>

        <nav className="sidebar-nav">
          {visibleNavItems.length > 0 ? (
            <div className="nav-group">
              {showNavText && <div className="nav-group-label">MENÚ</div>}
              {visibleNavItems.map((item, idx) => (
                <Fragment key={item.route}>
                  {showSalesBlock && salesInsertBeforeDaily === idx ? (
                    <SalesNavItem
                      collapsed={!showNavText}
                      salesSubSections={visibleSalesSubSections}
                    />
                  ) : null}
                  <Link
                    href={item.route}
                    className={`nav-item ${isActive(item.route) ? "active" : ""}`}
                  >
                    <SidebarNavIcon item={item} />
                    {showNavText && <span>{item.label}</span>}
                  </Link>
                </Fragment>
              ))}
              {showSalesBlock && salesInsertBeforeDaily === -1 ? (
                <SalesNavItem
                  collapsed={!showNavText}
                  salesSubSections={visibleSalesSubSections}
                />
              ) : null}
            </div>
          ) : null}
          {showReportsBlock ? (
            <div className="nav-group">
              {showNavText && <div className="nav-group-label">REPORTES</div>}
              <ReportsNavItem
                collapsed={!showNavText}
                reportSubSections={visibleReportSubSections}
              />
            </div>
          ) : null}
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
          <a
            href="https://wa.me/5358728126"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-item"
            aria-label="Contactar soporte por WhatsApp"
          >
            <Icon name="chat" />
            {showNavText && <span>Contactar soporte</span>}
          </a>
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
              aria-label="Asistente del manual"
              aria-expanded={manualChatOpen}
              aria-haspopup="dialog"
              onClick={() => setManualChatOpen((o) => !o)}
            >
              <MessageCircle
                className="size-[22px] shrink-0"
                strokeWidth={1.75}
                aria-hidden
              />
            </button>
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

      <ChatWidget
        hideFab
        open={manualChatOpen}
        onOpenChange={setManualChatOpen}
      />

      <MobileListLayoutOnboardingModal
        open={mobileListOnboardingOpen}
        onPick={(value: MobileListLayoutValue) => {
          setMobileListLayout(value);
          setMobileListOnboardingOpen(false);
        }}
        onDecideLater={() => {
          dismissMobileListLayoutOnboarding();
          setMobileListOnboardingOpen(false);
        }}
      />
    </div>
  );
}
