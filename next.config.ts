import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, context) => {
    if (process.env.WATCHPACK_POLLING) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
  turbopack: {}, // Silence warning about webpack usage
};

export default nextConfig;
