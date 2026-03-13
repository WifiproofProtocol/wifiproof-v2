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
      <div className="flex items-center gap-3 rounded-[1.75rem] border border-[#d2c5b0] bg-[#fbf7ee] p-6 text-[#1f1b17]">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="font-medium">Checking wallet environment...</span>
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
      <div className="space-y-6 rounded-[1.75rem] border border-[#d2c5b0] bg-[#fbf7ee] p-6">
        <div className="flex items-center gap-3 text-[#8c5a36]">
          <Smartphone className="h-6 w-6" />
          <h3 className="text-lg font-semibold text-[#1f1b17]">Open with a wallet</h3>
        </div>
        <p className="text-sm leading-7 text-[#5f564d]">
          Event creation needs a wallet browser so the organizer can sign the
          transaction on Base Sepolia.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href={coinbaseLink}
            className="flex items-center justify-center rounded-[1rem] bg-[#201b18] px-4 py-3 font-medium text-[#f7f1e7] transition-colors hover:bg-[#362e27]"
          >
            Open in Coinbase
          </a>
          <a
            href={metamaskLink}
            className="flex items-center justify-center rounded-[1rem] border border-[#d2c5b0] bg-white px-4 py-3 font-medium text-[#1f1b17] transition-colors hover:bg-[#f3ebdf]"
          >
            Open in MetaMask
          </a>
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
