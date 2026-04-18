import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  allowedDevOrigins: ['rbs-crew.cheikhmodiouf.org'],
  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: 'http://nestjs-api:4000/:path*',
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'rbsakademya.com' },
      { protocol: 'https', hostname: '*.rbsakademya.com' },
      { protocol: 'https', hostname: 'pub-f89062d997054062a74be2228aba1326.r2.dev' },
    ],
  },
};

export default nextConfig;
