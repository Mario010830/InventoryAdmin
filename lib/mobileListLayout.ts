/** Mismo breakpoint que el layout móvil de `DataTable`. */
export const MOBILE_LIST_LAYOUT_BREAKPOINT_PX = 768;

export const MOBILE_LIST_LAYOUT_STORAGE_KEY = "mobileListLayout";
export const MOBILE_LIST_LAYOUT_ONBOARDING_DISMISSED_KEY =
  "mobileListLayoutOnboardingDismissed";

export const MOBILE_LIST_LAYOUT_CHANGE_EVENT = "mobileListLayoutChange";

export type MobileListLayoutValue = "table" | "comfortable";

export const MOBILE_LIST_TABLE_PREVIEW_URL = "/images/modotabla.png";
export const MOBILE_LIST_COMFORTABLE_PREVIEW_URL = "/images/modophone.png";

function readStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function getMobileListLayout(): MobileListLayoutValue | null {
  const v = readStorage(MOBILE_LIST_LAYOUT_STORAGE_KEY);
  if (v === "table" || v === "comfortable") return v;
  return null;
}

export function setMobileListLayout(value: MobileListLayoutValue | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value === null) {
      localStorage.removeItem(MOBILE_LIST_LAYOUT_STORAGE_KEY);
    } else {
      localStorage.setItem(MOBILE_LIST_LAYOUT_STORAGE_KEY, value);
    }
    window.dispatchEvent(new Event(MOBILE_LIST_LAYOUT_CHANGE_EVENT));
  } catch {
    /* ignore quota / private mode */
  }
}

/** “Decidir después”: no guarda modo, pero no volver a mostrar el onboarding. */
export function dismissMobileListLayoutOnboarding(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MOBILE_LIST_LAYOUT_ONBOARDING_DISMISSED_KEY, "1");
    window.dispatchEvent(new Event(MOBILE_LIST_LAYOUT_CHANGE_EVENT));
  } catch {
    /* ignore */
  }
}

export function isMobileListViewport(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia(
      `(max-width: ${MOBILE_LIST_LAYOUT_BREAKPOINT_PX}px)`,
    ).matches;
  } catch {
    return false;
  }
}

/**
 * Tras login / primera carga del shell: móvil por ancho, sin preferencia guardada
 * y sin haber cerrado el aviso con “Decidir después”.
 */
export function shouldShowLayoutOnboarding(): boolean {
  if (typeof window === "undefined") return false;
  if (!isMobileListViewport()) return false;
  if (getMobileListLayout() !== null) return false;
  if (readStorage(MOBILE_LIST_LAYOUT_ONBOARDING_DISMISSED_KEY) === "1")
    return false;
  return true;
}
