"use client";

export function getPaymasterProxyUrl() {
  if (typeof window !== "undefined") {
    return new URL("/api/paymaster", window.location.origin).toString();
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  if (!appUrl) {
    return "/api/paymaster";
  }

  return new URL("/api/paymaster", appUrl).toString();
}
