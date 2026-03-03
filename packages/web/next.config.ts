import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@aztec/bb.js",
    "@noir-lang/noir_js",
    "@noir-lang/backend_barretenberg",
    "@wifiproof/proof-app",
  ],
};

export default nextConfig;
