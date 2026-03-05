"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Smartphone } from "lucide-react";

type WalletState = "checking" | "no_wallet" | "wrong_network" | "ready";

type WalletCardProps = {
  walletAddress: string;
  setWalletAddress: (address: string) => void;
  onReady: () => void;
};

function getEthereum() {
  if (typeof window === "undefined") {
    return undefined;
  }
  return (
    window as Window & {
      ethereum?: {
        request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      };
    }
  ).ethereum;
}

export default function WalletCard({
  walletAddress,
  setWalletAddress,
  onReady,
}: WalletCardProps) {
  const [walletState, setWalletState] = useState<WalletState>("checking");
  const [isSwitching, setIsSwitching] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");

  const checkWallet = useCallback(async () => {
    setWalletState("checking");
    const ethereum = getEthereum();
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
    }
    void checkWallet();
  }, [checkWallet]);

  async function connectAndCheck() {
    const ethereum = getEthereum();
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
    const ethereum = getEthereum();
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

  if (walletState === "checking") {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-cyan-900/30 bg-slate-900/50 p-6 text-cyan-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="font-medium">Detecting wallet environment...</span>
      </div>
    );
  }

  if (walletState === "no_wallet") {
    const href =
      currentUrl || (typeof window !== "undefined" ? window.location.href : "");
    const encodedUrl = encodeURIComponent(href);
    const coinbaseLink = `https://go.cb-w.com/dapp?cb_url=${encodedUrl}`;
    const metamaskLink = `https://metamask.app.link/dapp/${href.replace(/^https?:\/\//, "")}`;

    return (
      <div className="space-y-6 rounded-2xl border border-cyan-900/30 bg-slate-900/50 p-6">
        <div className="flex items-center gap-3 text-amber-400">
          <Smartphone className="h-6 w-6" />
          <h3 className="text-lg font-semibold">Web3 Wallet Required</h3>
        </div>
        <p className="text-sm leading-relaxed text-slate-400">
          Open this page inside a wallet browser to continue.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href={coinbaseLink}
            className="flex items-center justify-center rounded-xl bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-500"
          >
            Open in Coinbase
          </a>
          <a
            href={metamaskLink}
            className="flex items-center justify-center rounded-xl bg-orange-600 px-4 py-3 font-medium text-white transition-colors hover:bg-orange-500"
          >
            Open in MetaMask
          </a>
        </div>
      </div>
    );
  }

  if (walletState === "wrong_network") {
    return (
      <div className="space-y-4 rounded-2xl border border-red-900/30 bg-red-950/20 p-6">
        <div className="flex items-center gap-3 text-red-400">
          <AlertTriangle className="h-6 w-6" />
          <h3 className="text-lg font-semibold">Wrong Network</h3>
        </div>
        <p className="text-sm text-slate-400">
          Switch to Base Sepolia to continue.
        </p>
        <button
          onClick={switchNetwork}
          disabled={isSwitching}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 font-bold text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-50"
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
      <div className="space-y-4 rounded-2xl border border-cyan-900/30 bg-slate-900/50 p-6">
        <h3 className="text-lg font-semibold text-white">Connect Wallet</h3>
        <p className="text-sm text-slate-400">
          Connect a wallet to continue.
        </p>
        <button
          onClick={connectAndCheck}
          className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-bold text-slate-900 transition-all hover:bg-cyan-400 active:scale-[0.98]"
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-cyan-900/40 bg-cyan-950/20 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 text-cyan-400">
        <CheckCircle2 className="h-5 w-5" />
        <span className="text-sm font-medium text-slate-200">
          Connected:{" "}
          <span className="font-mono text-cyan-400">
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </span>
        </span>
      </div>
      <button
        onClick={onReady}
        className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-900 transition-colors hover:bg-cyan-400"
      >
        Continue
      </button>
    </div>
  );
}
