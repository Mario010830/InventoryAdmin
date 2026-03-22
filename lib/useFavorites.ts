"use client";

import { useCallback, useEffect, useState } from "react";

const LOCATIONS_KEY = "strova_favorite_locations";
const PRODUCTS_KEY = "strova_favorite_products";

function safeParseArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map((v) => String(v)) : [];
  } catch {
    return [];
  }
}

export function useFavorites() {
  const [favoriteLocations, setFavoriteLocations] = useState<string[]>([]);
  const [favoriteProducts, setFavoriteProducts] = useState<string[]>([]);

  // Initial load
  useEffect(() => {
    if (typeof window === "undefined") return;
    setFavoriteLocations(safeParseArray(window.localStorage.getItem(LOCATIONS_KEY)));
    setFavoriteProducts(safeParseArray(window.localStorage.getItem(PRODUCTS_KEY)));
  }, []);

  // Storage event sync (multi-tab)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: StorageEvent) => {
      if (e.key === LOCATIONS_KEY) {
        setFavoriteLocations(safeParseArray(e.newValue));
      }
      if (e.key === PRODUCTS_KEY) {
        setFavoriteProducts(safeParseArray(e.newValue));
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const toggleFavoriteLocation = useCallback((id: string) => {
    setFavoriteLocations((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id];
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LOCATIONS_KEY, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const toggleFavoriteProduct = useCallback((id: string) => {
    setFavoriteProducts((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id];
      if (typeof window !== "undefined") {
        window.localStorage.setItem(PRODUCTS_KEY, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const isFavoriteLocation = useCallback(
    (id: string) => favoriteLocations.includes(id),
    [favoriteLocations],
  );

  const isFavoriteProduct = useCallback(
    (id: string) => favoriteProducts.includes(id),
    [favoriteProducts],
  );

  return {
    favoriteLocations,
    favoriteProducts,
    toggleFavoriteLocation,
    toggleFavoriteProduct,
    isFavoriteLocation,
    isFavoriteProduct,
  };
}

