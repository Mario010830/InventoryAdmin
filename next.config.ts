import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/index.ts');

const nextConfig: NextConfig = {
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