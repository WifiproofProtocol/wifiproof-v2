import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
  serverExternalPackages: [
    "@aztec/bb.js",
    "@noir-lang/noir_js",
    "@noir-lang/backend_barretenberg",
    "@wifiproof/proof-app",
  ],
};

export default nextConfig;
