"use client";

import { cookieStorage, createStorage } from "wagmi";
import { baseSepolia } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";

const isDev = process.env.NODE_ENV !== "production";
const appUrl = (
  process.env.NEXT_PUBLIC_APP_URL ?? (isDev ? "http://localhost:3000" : "https://wifiproof.xyz")
).trim();
const baseSepoliaRpcUrl = `${appUrl.replace(/\/$/, "")}/api/rpc/base-sepolia`;

export const reownProjectId = (process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? "").trim();

const proxiedBaseSepolia = {
  ...baseSepolia,
  rpcUrls: {
    ...baseSepolia.rpcUrls,
    default: {
      http: [baseSepoliaRpcUrl],
    },
    public: {
      http: [baseSepoliaRpcUrl],
    },
  },
} as typeof baseSepolia;

export const reownNetworks: [typeof baseSepolia] = [proxiedBaseSepolia];
export const targetChainId = baseSepolia.id;

export const reownMetadata = {
  name: "WiFiProof",
  description: "Privacy-preserving proof of attendance on Base.",
  url: appUrl,
  icons: [`${appUrl.replace(/\/$/, "")}/WifiProofLogo.png`],
};

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  projectId: reownProjectId,
  networks: reownNetworks,
  customRpcUrls: {
    "eip155:84532": [{ url: baseSepoliaRpcUrl }],
  },
});

export const appKitConfig = {
  adapters: [wagmiAdapter],
  metadata: reownMetadata,
  networks: reownNetworks,
  defaultNetwork: baseSepolia,
  projectId: reownProjectId,
  allowUnsupportedChain: true,
  coinbasePreference: "smartWalletOnly" as const,
  features: {
    analytics: !isDev,
  },
};
