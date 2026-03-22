/**
 * URL servida por la app (`/proxy-image`) para que `<img>` no abra el túnel
 * directamente (ngrok/localtunnel devuelven HTML de advertencia sin headers).
 * Datos y blobs se devuelven tal cual.
 */
export function getProxiedImageSrc(src: string | null | undefined): string | undefined {
  if (!src?.trim()) return undefined;
  const s = src.trim();
  if (s.startsWith("data:") || s.startsWith("blob:")) return s;
  return `/proxy-image?path=${encodeURIComponent(s)}`;
}
