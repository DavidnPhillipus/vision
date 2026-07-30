import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The shared design/API layer lives outside this app's directory.
  experimental: {
    externalDir: true,
  },
  webpack(config) {
    config.resolve.alias["@vision/shared"] = path.resolve(dirname, "../shared/src");
    return config;
  },
  turbopack: {
    resolveAlias: {
      "@vision/shared": path.resolve(dirname, "../shared/src/index.ts"),
    },
  },
  async rewrites() {
    const api = process.env.API_PROXY_URL || "http://127.0.0.1:8000";
    return [
      { source: "/api/:path*", destination: `${api}/api/:path*` },
    ];
  },
};

export default nextConfig;
