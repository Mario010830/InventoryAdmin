/**
 * URL canónica del catálogo de una tienda en el sitio público:
 * `{CATALOG_PUBLIC_ORIGIN}/catalog/{slug}`.
 *
 * Origen: `NEXT_PUBLIC_CATALOG_URL` o `VITE_CATALOG_BASE_URL` (sin barra final).
 * Si no vienen definidas, se usa el mismo valor que `NEXT_PUBLIC_CATALOG_URL=https://tucuadre.com`.
 */

const DEFAULT_CATALOG_PUBLIC_ORIGIN = "https://tucuadre.com";

export function slugifyStoreName(name: string): string {
  const s = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "tienda";
}

export function publicStoreCatalogUrl(
  baseUrl: string,
  locationName: string,
): string {
  const origin = baseUrl.replace(/\/+$/, "");
  return `${origin}/catalog/${slugifyStoreName(locationName)}`;
}

/** Origen del catálogo público sin barra final (por defecto https://tucuadre.com). */
export function getCatalogPublicOrigin(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_CATALOG_URL?.trim() ??
    process.env.VITE_CATALOG_BASE_URL?.trim() ??
    DEFAULT_CATALOG_PUBLIC_ORIGIN;
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

export function tryPublicStoreCatalogUrl(locationName: string): string | null {
  const origin = getCatalogPublicOrigin();
  if (!origin) return null;
  return publicStoreCatalogUrl(origin, locationName);
}
