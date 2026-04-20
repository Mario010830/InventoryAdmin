"use client";

import { useSyncExternalStore } from "react";
import {
  getMobileListLayout,
  MOBILE_LIST_LAYOUT_BREAKPOINT_PX,
  MOBILE_LIST_LAYOUT_CHANGE_EVENT,
  type MobileListLayoutValue,
} from "@/lib/mobileListLayout";

function subscribe(onStoreChange: () => void) {
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener(MOBILE_LIST_LAYOUT_CHANGE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(MOBILE_LIST_LAYOUT_CHANGE_EVENT, handler);
  };
}

function getSnapshot(): MobileListLayoutValue | null {
  return getMobileListLayout();
}

function getServerSnapshot(): MobileListLayoutValue | null {
  return null;
}

/** Valor en `localStorage` (`table` | `comfortable`) o `null` si aún no eligió. */
export function useMobileListLayoutPreference(): MobileListLayoutValue | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Fuerza re-render cuando cambia el ancho respecto al breakpoint (p. ej. rotar).
 * Útil para `shouldShowLayoutOnboarding` en el shell.
 */
export function useMobileListViewportMatch(): boolean {
  const q = `(max-width: ${MOBILE_LIST_LAYOUT_BREAKPOINT_PX}px)`;
  return useSyncExternalStore(
    (onStoreChange) => {
      const mq = window.matchMedia(q);
      mq.addEventListener("change", onStoreChange);
      return () => mq.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia(q).matches,
    () => false,
  );
}
