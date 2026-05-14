import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Opt out crypto packages from Next.js server-side bundling
  serverExternalPackages: [
    "libsodium",
    "libsodium-wrappers",
    "libsodium-wrappers-sumo",
    "@cardano-sdk/crypto",
  ],

  // Configure Turbopack aliases for sub-module routing
  turbopack: {
    resolveAlias: {
      // Safely points the internal relative .mjs import directly to the absolute module path
      "./libsodium-sumo.mjs":
        "libsodium-wrappers-sumo/dist/modules-sumo-esm/libsodium-sumo.mjs",
    },
  },
};

export default nextConfig;
