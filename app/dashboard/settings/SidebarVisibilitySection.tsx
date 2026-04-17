"use client";

import { useMemo } from "react";
import Switch from "@/components/Switch";
import {
  ADMIN_SIDEBAR_ITEMS,
  MAIN_SIDEBAR_ITEMS,
  REPORT_SIDEBAR_PARENT,
  REPORT_SIDEBAR_SECTIONS,
  SALES_SIDEBAR_PARENT,
  SALES_SIDEBAR_SECTIONS,
  canSeeSalesSection,
  type SidebarNavItem,
} from "@/lib/sidebarNavConfig";
import {
  resetSidebarVisibility,
  setSidebarRouteHidden,
  useHiddenSidebarRoutes,
} from "@/lib/sidebarVisibility";
import { useUserPermissionCodes } from "@/lib/useUserPermissionCodes";

function filterByPermission(
  items: SidebarNavItem[],
  has: (code: string) => boolean,
): SidebarNavItem[] {
  return items.filter((item) => !item.permission || has(item.permission));
}

export function SidebarVisibilitySection() {
  const { has: hasPermission } = useUserPermissionCodes();
  const hidden = useHiddenSidebarRoutes();

  const mainItems = useMemo(
    () => filterByPermission(MAIN_SIDEBAR_ITEMS, hasPermission),
    [hasPermission],
  );
  const adminItems = useMemo(
    () => filterByPermission(ADMIN_SIDEBAR_ITEMS, hasPermission),
    [hasPermission],
  );
  const reportItems = useMemo(
    () => [REPORT_SIDEBAR_PARENT, ...REPORT_SIDEBAR_SECTIONS],
    [],
  );

  const salesVisibilityItems = useMemo(
    () => [
      { route: SALES_SIDEBAR_PARENT.route, label: "Ventas (bloque)" },
      ...SALES_SIDEBAR_SECTIONS.filter((s) =>
        canSeeSalesSection(s, hasPermission),
      ).map((s) => ({ route: s.route, label: `Ventas · ${s.label}` })),
    ],
    [hasPermission],
  );

  const isHidden = (route: string) => hidden.includes(route);

  return (
    <div className="settings-field-grid settings-field-grid--stack">
      <p
        className="settings-helper settings-field--full"
        style={{ marginBottom: 8 }}
      >
        Elige qué enlaces aparecen en la barra lateral. Solo afecta a tu
        navegador; los permisos del sistema siguen aplicándose.
      </p>

      <div className="settings-sidebar-toggles settings-field--full">
        <div className="settings-sidebar-toggles__group">
          <h3 className="settings-sidebar-toggles__title">Menú</h3>
          <ul className="settings-sidebar-toggles__list">
            {mainItems.map((item) => (
              <li key={item.route} className="settings-sidebar-toggles__row">
                <Switch
                  checked={!isHidden(item.route)}
                  onChange={(checked) =>
                    setSidebarRouteHidden(item.route, !checked)
                  }
                />
                <span className="settings-sidebar-toggles__label">
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="settings-sidebar-toggles__group">
          <h3 className="settings-sidebar-toggles__title">Ventas</h3>
          <ul className="settings-sidebar-toggles__list">
            {salesVisibilityItems.map((item) => (
              <li key={item.route} className="settings-sidebar-toggles__row">
                <Switch
                  checked={!isHidden(item.route)}
                  onChange={(checked) =>
                    setSidebarRouteHidden(item.route, !checked)
                  }
                />
                <span className="settings-sidebar-toggles__label">
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="settings-sidebar-toggles__group">
          <h3 className="settings-sidebar-toggles__title">Reportes</h3>
          <ul className="settings-sidebar-toggles__list">
            {reportItems.map((item) => (
              <li key={item.route} className="settings-sidebar-toggles__row">
                <Switch
                  checked={!isHidden(item.route)}
                  onChange={(checked) =>
                    setSidebarRouteHidden(item.route, !checked)
                  }
                />
                <span className="settings-sidebar-toggles__label">
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="settings-sidebar-toggles__group">
          <h3 className="settings-sidebar-toggles__title">Administración</h3>
          <ul className="settings-sidebar-toggles__list">
            {adminItems.map((item) => {
              const locked = item.route === "/dashboard/settings";
              return (
                <li key={item.route} className="settings-sidebar-toggles__row">
                  <Switch
                    checked={!isHidden(item.route)}
                    disabled={locked}
                    onChange={(checked) =>
                      setSidebarRouteHidden(item.route, !checked)
                    }
                  />
                  <span
                    className="settings-sidebar-toggles__label"
                    title={
                      locked
                        ? "Este enlace no se puede ocultar para que puedas volver a esta pantalla."
                        : undefined
                    }
                  >
                    {item.label}
                    {locked ? (
                      <span className="settings-sidebar-toggles__badge">
                        siempre visible
                      </span>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="settings-field settings-field--full">
        <button
          type="button"
          className="settings-btn settings-btn--primary-outline"
          onClick={() => resetSidebarVisibility()}
        >
          Restaurar barra lateral (mostrar todo)
        </button>
      </div>
    </div>
  );
}
