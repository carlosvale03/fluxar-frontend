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
  // As rotas do Django terminam em "/". Sem esta opção, o Next responde 308
  // tirando a barra final antes do rewrite, e o POST chega ao Django sem ela.
  skipTrailingSlashRedirect: true,
  // A API fica na mesma origem da página (AD-036), para o cookie de renovação
  // ser de primeira parte em qualquer navegador (SESSAO-05)
  async rewrites() {
    const backend = process.env.BACKEND_URL || "http://localhost:8000";
    return [
      { source: "/api/:path*/", destination: `${backend}/api/:path*/` },
      { source: "/api/:path*", destination: `${backend}/api/:path*` },
    ];
  },
};

export default nextConfig;
