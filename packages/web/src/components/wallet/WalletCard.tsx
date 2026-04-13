"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppKit } from "@reown/appkit/react";
import { AlertTriangle, CheckCircle2, Loader2, Smartphone, Wallet2 } from "lucide-react";
import { useAccount, useChainId, useDisconnect, useSwitchChain } from "wagmi";

import { targetChainId } from "@/lib/reown";

type WalletCardProps = {
  walletAddress: string;
  setWalletAddress?: (address: string) => void;
  onReady: () => void;
};

const MOBILE_PENDING_KEY = "wifiproof.mobile.wallet.pending";

function isMobileUserAgent(userAgent: string) {
  return /android|iphone|ipad|ipod|mobile/i.test(userAgent);
}

export default function WalletCard({
  walletAddress,
  setWalletAddress,
  onReady,
}: WalletCardProps) {
  const { open } = useAppKit();
  const { address, isConnected, status } = useAccount();
  const { disconnectAsync, isPending: isDisconnecting } = useDisconnect();
  const chainId = useChainId();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();

  const [userAgent] = useState(() =>
    typeof window === "undefined" ? "" : window.navigator.userAgent
  );
  const [isOpeningWallet, setIsOpeningWallet] = useState(false);
  const [pendingMobileReturn, setPendingMobileReturn] = useState(() =>
    typeof window === "undefined"
      ? false
      : window.sessionStorage.getItem(MOBILE_PENDING_KEY) === "1"
  );
  const lastReadyAddressRef = useRef<string>("");

  const isMobile = useMemo(() => isMobileUserAgent(userAgent), [userAgent]);
  const isWrongNetwork = Boolean(isConnected && chainId && chainId !== targetChainId);
  const isChecking = status === "reconnecting";
  const isAwaitingMobileReturn = isMobile && pendingMobileReturn && !isConnected;

  const syncPendingWalletReturn = useCallback(() => {
    if (typeof window === "undefined") return;
    setPendingMobileReturn(window.sessionStorage.getItem(MOBILE_PENDING_KEY) === "1");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResume = () => {
      if (document.visibilityState && document.visibilityState !== "visible") {
        return;
      }
      syncPendingWalletReturn();
    };

    window.addEventListener("focus", handleResume);
    window.addEventListener("pageshow", handleResume);
    document.addEventListener("visibilitychange", handleResume);

    return () => {
      window.removeEventListener("focus", handleResume);
      window.removeEventListener("pageshow", handleResume);
      document.removeEventListener("visibilitychange", handleResume);
    };
  }, [syncPendingWalletReturn]);

  useEffect(() => {
    setWalletAddress?.(address ?? "");

    if (isConnected) {
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(MOBILE_PENDING_KEY);
        window.requestAnimationFrame(() => {
          setPendingMobileReturn(false);
          setIsOpeningWallet(false);
        });
      }
    } else if (!address) {
      lastReadyAddressRef.current = "";
    }
  }, [address, isConnected, setWalletAddress]);

  useEffect(() => {
    if (!address || !isConnected || isWrongNetwork) {
      return;
    }

    if (lastReadyAddressRef.current === address) {
      return;
    }

    lastReadyAddressRef.current = address;
    onReady();
  }, [address, isConnected, isWrongNetwork, onReady]);

  async function openWalletModal() {
    try {
      if (typeof window !== "undefined" && isMobile) {
        window.sessionStorage.setItem(MOBILE_PENDING_KEY, "1");
        setPendingMobileReturn(true);
      }

      setIsOpeningWallet(true);
      await open({ view: "Connect" });
    } catch (error) {
      console.error("[wallet] failed to open wallet modal", error);
    } finally {
      setIsOpeningWallet(false);
    }
  }

  async function handleSwitchNetwork() {
    if (!switchChainAsync) return;

    try {
      await switchChainAsync({ chainId: targetChainId });
    } catch (error) {
      console.error("[wallet] switch network failed", error);
    }
  }

  async function handleDisconnect() {
    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(MOBILE_PENDING_KEY);
      }
      lastReadyAddressRef.current = "";
      setPendingMobileReturn(false);
      setIsOpeningWallet(false);
      await disconnectAsync();
    } catch (error) {
      console.error("[wallet] disconnect failed", error);
    }
  }

  async function handleChangeWallet() {
    try {
      setIsOpeningWallet(true);
      await open({ view: "Connect" });
    } catch (error) {
      console.error("[wallet] failed to reopen wallet modal", error);
    } finally {
      setIsOpeningWallet(false);
    }
  }

  if (isChecking) {
    return (
      <div className="flex items-center gap-3 rounded-[1.75rem] border border-[#d2c5b0] bg-[#fbf7ee] p-6 text-[#1f1b17]">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="font-medium">Checking wallet session...</span>
      </div>
    );
  }

  if (isWrongNetwork) {
    return (
      <div className="space-y-4 rounded-[1.75rem] border border-[#d7b7b0] bg-[#fff3f0] p-6">
        <div className="flex items-center gap-3 text-[#a5483c]">
          <AlertTriangle className="h-6 w-6" />
          <h3 className="text-lg font-semibold text-[#1f1b17]">Switch to Base Sepolia</h3>
        </div>
        <p className="text-sm leading-7 text-[#5f564d]">
          Your wallet is connected on the wrong network.
        </p>
        <button
          type="button"
          onClick={handleSwitchNetwork}
          disabled={isSwitching}
          className="flex w-full items-center justify-center gap-2 rounded-[1rem] bg-[#201b18] px-4 py-3 font-semibold text-[#f7f1e7] transition-all hover:bg-[#362e27] disabled:opacity-50"
        >
          {isSwitching ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Switching network...
            </>
          ) : (
            "Switch to Base Sepolia"
          )}
        </button>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleChangeWallet}
            disabled={isOpeningWallet || isDisconnecting}
            className="flex-1 rounded-[1rem] border border-[#d2c5b0] bg-white px-4 py-3 text-sm font-semibold text-[#1f1b17] transition-colors hover:bg-[#f6ede2] disabled:opacity-50"
          >
            {isOpeningWallet ? "Opening..." : "Choose different wallet"}
          </button>
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={isDisconnecting || isOpeningWallet}
            className="flex-1 rounded-[1rem] border border-[#e5c5bd] bg-[#fffaf8] px-4 py-3 text-sm font-semibold text-[#8d4134] transition-colors hover:bg-[#ffefe9] disabled:opacity-50"
          >
            {isDisconnecting ? "Disconnecting..." : "Disconnect"}
          </button>
        </div>
      </div>
    );
  }

  if (!walletAddress) {
    return (
      <div className="space-y-4 rounded-[1.75rem] border border-[#d2c5b0] bg-[#fbf7ee] p-6">
        <div className="flex items-center gap-3 text-[#1f1b17]">
          <Wallet2 className="h-6 w-6 text-[#2563eb]" />
          <h3 className="text-lg font-semibold">Connect wallet</h3>
        </div>
        <p className="text-sm leading-7 text-[#5f564d]">
          Choose a wallet to continue. Base Smart Wallet is recommended for the best sponsored-claim experience.
        </p>
        <button
          type="button"
          onClick={openWalletModal}
          disabled={isOpeningWallet}
          className="flex w-full items-center justify-center gap-2 rounded-[1rem] bg-[#201b18] px-4 py-3 font-semibold text-[#f7f1e7] transition-all hover:bg-[#362e27] disabled:opacity-50"
        >
          {isOpeningWallet ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Opening wallet list...
            </>
          ) : (
            "Connect wallet"
          )}
        </button>

        {isMobile && (
          <div className="rounded-[1.2rem] border border-[#d7e4f6] bg-white/80 p-4 text-sm leading-7 text-[#5f564d]">
            <p className="flex items-center gap-2 font-semibold text-[#1f1b17]">
              <Smartphone className="h-4 w-4 text-[#2563eb]" />
              Mobile flow
            </p>
            <p className="mt-2">
              If your wallet opens in a separate app, approve there and return here.
            </p>
            {isAwaitingMobileReturn && (
              <p className="mt-3 rounded-[1rem] bg-[#eef4ff] px-3 py-3 text-[#25559a]">
                Waiting for wallet approval. Return here after approving.
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-[1.5rem] border border-[#d2c5b0] bg-[#fbf7ee] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 text-[#5f6f52]">
        <CheckCircle2 className="h-5 w-5" />
        <span className="text-sm font-medium text-[#1f1b17]">
          Connected:{" "}
          <span className="font-mono text-[#2563eb]">
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </span>
        </span>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={handleChangeWallet}
          disabled={isOpeningWallet || isDisconnecting}
          className="rounded-full border border-[#d2c5b0] bg-white px-4 py-2 text-sm font-semibold text-[#1f1b17] transition-colors hover:bg-[#f3ebdf] disabled:opacity-50"
        >
          {isOpeningWallet ? "Opening..." : "Change wallet"}
        </button>
        <button
          type="button"
          onClick={handleDisconnect}
          disabled={isDisconnecting || isOpeningWallet}
          className="rounded-full border border-[#e5c5bd] bg-[#fffaf8] px-4 py-2 text-sm font-semibold text-[#8d4134] transition-colors hover:bg-[#ffefe9] disabled:opacity-50"
        >
          {isDisconnecting ? "Disconnecting..." : "Disconnect"}
        </button>
        <button
          type="button"
          onClick={onReady}
          className="rounded-full bg-[#201b18] px-4 py-2 text-sm font-semibold text-[#f7f1e7] transition-colors hover:bg-[#362e27]"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
