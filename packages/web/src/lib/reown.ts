"use client";

import { cookieStorage, createStorage } from "wagmi";
import { baseSepolia } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";

const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://wifiproof.xyz").trim();

export const reownProjectId = (process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? "").trim();

export const reownNetworks: [typeof baseSepolia] = [baseSepolia];
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
    analytics: true,
  },
};
