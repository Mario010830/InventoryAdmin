"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "tuCuadre.sidebarVisibility.v1";

/** Rutas que no se pueden ocultar (acceso a esta pantalla). */
export const SIDEBAR_ALWAYS_VISIBLE_ROUTES = new Set<string>([
  "/dashboard/settings",
]);

type StoredShape = { hidden: string[] };

function parseStored(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  try {
    const o = JSON.parse(raw) as StoredShape;
    if (!Array.isArray(o.hidden)) return [];
    return o.hidden
      .filter((x) => typeof x === "string")
      .filter((r) => !SIDEBAR_ALWAYS_VISIBLE_ROUTES.has(r));
  } catch {
    return [];
  }
}

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function getHiddenSidebarRoutes(): string[] {
  if (typeof window === "undefined") return [];
  return parseStored(localStorage.getItem(STORAGE_KEY));
}

export function setHiddenSidebarRoutes(hidden: string[]): void {
  if (typeof window === "undefined") return;
  const next = [...new Set(hidden)].filter(
    (r) => !SIDEBAR_ALWAYS_VISIBLE_ROUTES.has(r),
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ hidden: next }));
  emit();
}

export function setSidebarRouteHidden(route: string, hidden: boolean): void {
  if (SIDEBAR_ALWAYS_VISIBLE_ROUTES.has(route)) return;
  const cur = getHiddenSidebarRoutes();
  const set = new Set(cur);
  if (hidden) set.add(route);
  else set.delete(route);
  setHiddenSidebarRoutes([...set]);
}

export function resetSidebarVisibility(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

/** Referencia estable para lista vacía (exigido por useSyncExternalStore). */
const EMPTY_HIDDEN_SNAPSHOT: string[] = [];

let cachedSyncSnapshot: string[] = EMPTY_HIDDEN_SNAPSHOT;
let lastSyncStorageRaw: string | null | undefined;

/**
 * Debe devolver la misma referencia de array si localStorage no cambió;
 * si no, React 19 / useSyncExternalStore avisa de bucle infinito.
 */
function getSnapshot(): string[] {
  if (typeof window === "undefined") return EMPTY_HIDDEN_SNAPSHOT;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === lastSyncStorageRaw) {
    return cachedSyncSnapshot;
  }
  lastSyncStorageRaw = raw;
  const parsed = parseStored(raw);
  cachedSyncSnapshot = parsed.length === 0 ? EMPTY_HIDDEN_SNAPSHOT : parsed;
  return cachedSyncSnapshot;
}

function getServerSnapshot(): string[] {
  return EMPTY_HIDDEN_SNAPSHOT;
}

/** Lista de rutas ocultas en el sidebar (persistido en localStorage). */
export function useHiddenSidebarRoutes(): string[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useIsSidebarRouteHidden(route: string): boolean {
  const hidden = useHiddenSidebarRoutes();
  return hidden.includes(route);
}
