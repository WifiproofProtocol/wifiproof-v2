"use client";

export function getClientBaseRpcUrl() {
  if (typeof window === "undefined") {
    return (process.env.NEXT_PUBLIC_BASE_RPC_URL ?? "https://sepolia.base.org").trim();
  }

  return new URL("/api/rpc/base-sepolia", window.location.origin).toString();
}
