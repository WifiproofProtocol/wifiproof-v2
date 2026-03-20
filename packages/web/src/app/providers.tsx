"use client";

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppKitProvider } from "@reown/appkit/react";
import { WagmiProvider } from "wagmi";

import { appKitConfig, wagmiAdapter } from "@/lib/reown";

type ProvidersProps = {
  children: ReactNode;
};

const queryClient = new QueryClient();

export default function Providers({ children }: ProvidersProps) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        <AppKitProvider {...appKitConfig}>{children}</AppKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
