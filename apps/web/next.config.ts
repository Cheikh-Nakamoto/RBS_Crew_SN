import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'rbsakademya.com' },
      { protocol: 'https', hostname: '*.rbsakademya.com' },
    ],
  },
};

export default nextConfig;
