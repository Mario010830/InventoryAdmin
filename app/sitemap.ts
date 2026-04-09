import type { MetadataRoute } from "next";

function baseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (fromEnv) return fromEnv;
  if (process.env.VERCEL_URL) {
    const host = process.env.VERCEL_URL.replace(/\/+$/, "");
    return host.startsWith("http") ? host : `https://${host}`;
  }
  return "http://localhost:3000";
}

/** Rutas públicas indexables (no dashboard/reportes/admin: requieren sesión). */
const publicPaths = ["/", "/catalog"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = baseUrl();
  const lastModified = new Date();

  return publicPaths.map((path) => ({
    url: path === "/" ? origin : `${origin}${path}`,
    lastModified,
    changeFrequency: path === "/" ? "weekly" : "daily",
    priority: path === "/" ? 1 : 0.8,
  }));
}
