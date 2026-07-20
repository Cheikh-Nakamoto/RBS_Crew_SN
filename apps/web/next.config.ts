import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: process.env.API_REWRITE_TARGET ?? 'http://localhost:4000/:path*',
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
