import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/index.ts");

/** Misma convención que `getApiUrl()` en `lib/auth-api.ts`: origen del backend para `/api/*` en el rewrite. */
const BACKEND_URL = "https://api.tucuadre.com/api";

function apiRewriteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? BACKEND_URL;
  try {
    const url = new URL(raw);
    let path = url.pathname.replace(/\/+$/, "");
    if (path.endsWith("/api")) {
      path = path.slice(0, -4);
    }
    const base = `${url.origin}${path}`.replace(/\/$/, "");
    return base || url.origin;
  } catch {
    return "http://inventorydevelop.us-east-2.elasticbeanstalk.com";
  }
}

const nextConfig: NextConfig = {
  /** Imagen Docker: solo copia lo necesario para `next start` vía `server.js`. */
  output: "standalone",
  /**
   * Dominios permitidos para `next/image` (optimizador `/_next/image`).
   * No usa JWT: solo hosts declarados aquí. Añade API, CDN y scrapers.
   */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "inventorydevelop.us-east-2.elasticbeanstalk.com",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "inventorydevelop.us-east-2.elasticbeanstalk.com",
        pathname: "/**",
      },
      { protocol: "http", hostname: "162.220.165.172", pathname: "/**" },
      {
        protocol: "https",
        hostname: "elyerromenu.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.elyerromenu.com",
        pathname: "/**",
      },
      { protocol: "http", hostname: "localhost", pathname: "/**" },
      { protocol: "https", hostname: "localhost", pathname: "/**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiRewriteOrigin()}/api/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
