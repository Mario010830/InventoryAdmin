import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/index.ts');

const nextConfig: NextConfig = {
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
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://inventorydevelop.us-east-2.elasticbeanstalk.com/api/:path*',
      },
    ];
  },
};

export default withNextIntl(nextConfig);