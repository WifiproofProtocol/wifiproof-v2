"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Smartphone,
} from "lucide-react";

import {
  getAvailableWalletProviders,
  getInjectedEthereum,
  getSelectedWalletProviderId,
  setSelectedWalletProviderId,
  type WalletProviderOption,
} from "@/lib/wallet-provider";

type WalletState = "checking" | "no_wallet" | "wrong_network" | "ready";

type WalletCardProps = {
  walletAddress: string;
  setWalletAddress: (address: string) => void;
  onReady: () => void;
};

function isMobileUserAgent(userAgent: string) {
  return /android|iphone|ipad|ipod|mobile/i.test(userAgent);
}

function isIosUserAgent(userAgent: string) {
  return /iphone|ipad|ipod/i.test(userAgent);
}

function buildCoinbaseUniversalLink(url: string) {
  return `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(url)}`;
}

function buildCoinbaseSchemeLink(url: string) {
  return `cbwallet://dapp?url=${encodeURIComponent(url)}`;
}

function buildMetaMaskLink(url: string) {
  return `https://metamask.app.link/dapp/${url.replace(/^https?:\/\//, "")}`;
}

export default function WalletCard({
  walletAddress,
  setWalletAddress,
  onReady,
}: WalletCardProps) {
  const [walletState, setWalletState] = useState<WalletState>("checking");
  const [isSwitching, setIsSwitching] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");
  const [userAgent, setUserAgent] = useState("");
  const [copied, setCopied] = useState(false);
  const [providerOptions, setProviderOptions] = useState<WalletProviderOption[]>([]);
  const [selectedProviderId, setSelectedProviderIdState] = useState<string | null>(null);

  const refreshProviders = useCallback(() => {
    const providers = getAvailableWalletProviders();
    setProviderOptions(providers);

    if (providers.length === 0) {
      setSelectedProviderIdState(null);
      return;
    }

    const persisted = getSelectedWalletProviderId();
    const chosen = persisted && providers.some((provider) => provider.id === persisted)
      ? persisted
      : providers[0].id;

    setSelectedWalletProviderId(chosen);
    setSelectedProviderIdState(chosen);
  }, []);

  const checkWallet = useCallback(async () => {
    setWalletState("checking");
    const ethereum = getInjectedEthereum();
    if (!ethereum) {
      setWalletState("no_wallet");
      return;
    }

    try {
      const chainIdHex = (await ethereum.request({
        method: "eth_chainId",
      })) as string;

      if (chainIdHex?.toLowerCase() !== "0x14a34") {
        setWalletState("wrong_network");
        return;
      }

      const accounts = (await ethereum.request({
        method: "eth_accounts",
      })) as string[];

      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
        setWalletState("ready");
        onReady();
        return;
      }

      setWalletState("ready");
    } catch (error) {
      console.error("[wallet] check failed", error);
      setWalletState("no_wallet");
    }
  }, [onReady, setWalletAddress]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentUrl(window.location.href);
      setUserAgent(window.navigator.userAgent);
    }
    refreshProviders();
    void checkWallet();
  }, [checkWallet, refreshProviders]);

  async function connectAndCheck() {
    const ethereum = getInjectedEthereum();
    if (!ethereum) return;

    try {
      const accounts = (await ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
      }
      await checkWallet();
    } catch (error) {
      console.error("[wallet] connect rejected", error);
    }
  }

  async function switchNetwork() {
    const ethereum = getInjectedEthereum();
    if (!ethereum) return;

    setIsSwitching(true);
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x14A34" }],
      });
      await checkWallet();
    } catch (error) {
      const err = error as { code?: number };
      if (err.code === 4902) {
        try {
          await ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0x14A34",
                chainName: "Base Sepolia",
                rpcUrls: ["https://sepolia.base.org"],
                nativeCurrency: {
                  name: "Sepolia ETH",
                  symbol: "ETH",
                  decimals: 18,
                },
                blockExplorerUrls: ["https://sepolia.basescan.org"],
              },
            ],
          });
          await checkWallet();
        } catch (addError) {
          console.error("[wallet] add network failed", addError);
        }
      } else {
        console.error("[wallet] switch network failed", error);
      }
    } finally {
      setIsSwitching(false);
    }
  }

  function openBaseApp() {
    if (typeof window === "undefined" || !currentUrl) return;

    const universalLink = buildCoinbaseUniversalLink(currentUrl);
    const schemeLink = buildCoinbaseSchemeLink(currentUrl);

    if (isIosUserAgent(userAgent)) {
      window.location.href = schemeLink;
      window.setTimeout(() => {
        window.location.href = universalLink;
      }, 700);
      return;
    }

    window.location.href = universalLink;
  }

  async function copyCurrentUrl() {
    if (!currentUrl || typeof navigator === "undefined" || !navigator.clipboard) return;

    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("[wallet] failed to copy current url", error);
    }
  }

  function handleSelectProvider(providerId: string) {
    setSelectedWalletProviderId(providerId);
    setSelectedProviderIdState(providerId);
    void checkWallet();
  }

  if (walletState === "checking") {
    return (
      <div className="flex items-center gap-3 rounded-[1.75rem] border border-[#d2c5b0] bg-[#fbf7ee] p-6 text-[#1f1b17]">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="font-medium">Checking wallet environment...</span>
      </div>
    );
  }

  if (walletState === "no_wallet") {
    const href =
      currentUrl || (typeof window !== "undefined" ? window.location.href : "");
    const coinbaseLink = buildCoinbaseUniversalLink(href);
    const coinbaseSchemeLink = buildCoinbaseSchemeLink(href);
    const metamaskLink = buildMetaMaskLink(href);
    const isMobile = isMobileUserAgent(userAgent);

    return (
      <div className="space-y-6 rounded-[1.75rem] border border-[#d2c5b0] bg-[#fbf7ee] p-6">
        <div className="flex items-center gap-3 text-[#8c5a36]">
          <Smartphone className="h-6 w-6" />
          <h3 className="text-lg font-semibold text-[#1f1b17]">
            {isMobile ? "Open in a wallet browser" : "Open with a wallet"}
          </h3>
        </div>
        <p className="text-sm leading-7 text-[#5f564d]">
          {isMobile
            ? "If you are on mobile, open this page inside the Base app or MetaMask browser before trying to connect. A normal mobile browser usually will not inject a wallet provider."
            : "Event creation needs a wallet browser so the organizer can sign the transaction on Base Sepolia."}
        </p>

        {isMobile && (
          <div className="rounded-[1.2rem] border border-[#d7e4f6] bg-white/80 p-4 text-xs leading-6 text-[#5f564d]">
            <p className="font-semibold text-[#1f1b17]">Mobile notes</p>
            <p className="mt-2">
              Base app cross-device QR connection is no longer supported. Open the app
              directly in the Base app explorer or from a mobile deep link.
            </p>
            <p className="mt-2">
              If Base app is in Simple mode, dapp transactions are disabled. Turn
              Simple mode off in Base app settings first.
            </p>
          </div>
        )}

        {!isMobile && providerOptions.length > 1 && (
          <div className="rounded-[1.2rem] border border-[#d7e4f6] bg-white/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6f84a1]">
              Detected browser wallets
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {providerOptions.map((provider) => {
                const isSelected = provider.id === selectedProviderId;
                return (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => handleSelectProvider(provider.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      isSelected
                        ? "bg-[#201b18] text-[#f7f1e7]"
                        : "border border-[#d2c5b0] bg-white text-[#1f1b17] hover:bg-[#f3ebdf]"
                    }`}
                  >
                    {provider.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {isMobile ? (
            <button
              type="button"
              onClick={openBaseApp}
              className="flex items-center justify-center gap-2 rounded-[1rem] bg-[#201b18] px-4 py-3 font-medium text-[#f7f1e7] transition-colors hover:bg-[#362e27]"
            >
              Open in Base App
              <ExternalLink className="h-4 w-4" />
            </button>
          ) : (
            <a
              href={coinbaseLink}
              className="flex items-center justify-center rounded-[1rem] bg-[#201b18] px-4 py-3 font-medium text-[#f7f1e7] transition-colors hover:bg-[#362e27]"
            >
              Open in Base App
            </a>
          )}
          <a
            href={metamaskLink}
            className="flex items-center justify-center rounded-[1rem] border border-[#d2c5b0] bg-white px-4 py-3 font-medium text-[#1f1b17] transition-colors hover:bg-[#f3ebdf]"
          >
            Open in MetaMask
          </a>
        </div>

        {isMobile && isIosUserAgent(userAgent) && (
          <a
            href={coinbaseSchemeLink}
            className="flex items-center justify-center rounded-[1rem] border border-[#d2c5b0] bg-white px-4 py-3 text-sm font-medium text-[#1f1b17] transition-colors hover:bg-[#f3ebdf]"
          >
            iPhone fallback link
          </a>
        )}

        <div className="rounded-[1.2rem] border border-[#d7e4f6] bg-white/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6f84a1]">
            Current URL
          </p>
          <p className="mt-2 break-all text-xs leading-6 text-[#5f564d]">{href}</p>
          <button
            type="button"
            onClick={copyCurrentUrl}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#d2c5b0] px-3 py-1.5 text-xs font-medium text-[#1f1b17] transition hover:bg-[#f3ebdf]"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      </div>
    );
  }

  if (walletState === "wrong_network") {
    return (
      <div className="space-y-4 rounded-[1.75rem] border border-[#d7b7b0] bg-[#fff3f0] p-6">
        <div className="flex items-center gap-3 text-[#a5483c]">
          <AlertTriangle className="h-6 w-6" />
          <h3 className="text-lg font-semibold text-[#1f1b17]">Wrong network</h3>
        </div>
        <p className="text-sm leading-7 text-[#5f564d]">
          Switch to Base Sepolia to continue.
        </p>
        {providerOptions.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {providerOptions.map((provider) => {
              const isSelected = provider.id === selectedProviderId;
              return (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => handleSelectProvider(provider.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    isSelected
                      ? "bg-[#201b18] text-[#f7f1e7]"
                      : "border border-[#d2c5b0] bg-white text-[#1f1b17] hover:bg-[#f9ebe7]"
                  }`}
                >
                  {provider.name}
                </button>
              );
            })}
          </div>
        )}
        <button
          onClick={switchNetwork}
          disabled={isSwitching}
          className="flex w-full items-center justify-center gap-2 rounded-[1rem] bg-[#201b18] px-4 py-3 font-semibold text-[#f7f1e7] transition-all hover:bg-[#362e27] disabled:opacity-50"
        >
          {isSwitching ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Switching...
            </>
          ) : (
            "Switch to Base Sepolia"
          )}
        </button>
      </div>
    );
  }

  if (!walletAddress) {
    return (
      <div className="space-y-4 rounded-[1.75rem] border border-[#d2c5b0] bg-[#fbf7ee] p-6">
        <h3 className="text-lg font-semibold text-[#1f1b17]">Connect wallet</h3>
        <p className="text-sm leading-7 text-[#5f564d]">
          Connect the organizer wallet you want to use for event creation.
        </p>
        {providerOptions.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {providerOptions.map((provider) => {
              const isSelected = provider.id === selectedProviderId;
              return (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() => handleSelectProvider(provider.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    isSelected
                      ? "bg-[#201b18] text-[#f7f1e7]"
                      : "border border-[#d2c5b0] bg-white text-[#1f1b17] hover:bg-[#f3ebdf]"
                  }`}
                >
                  {provider.name}
                </button>
              );
            })}
          </div>
        )}
        <button
          onClick={connectAndCheck}
          className="w-full rounded-[1rem] bg-[#201b18] px-4 py-3 font-semibold text-[#f7f1e7] transition-all hover:bg-[#362e27] active:scale-[0.98]"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-[1.5rem] border border-[#d2c5b0] bg-[#fbf7ee] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 text-[#5f6f52]">
        <CheckCircle2 className="h-5 w-5" />
        <span className="text-sm font-medium text-[#1f1b17]">
          Connected:{" "}
          <span className="font-mono text-[#5f6f52]">
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </span>
        </span>
      </div>
      <button
        onClick={onReady}
        className="rounded-full bg-[#201b18] px-4 py-2 text-sm font-semibold text-[#f7f1e7] transition-colors hover:bg-[#362e27]"
      >
        Continue
      </button>
    </div>
  );
}
