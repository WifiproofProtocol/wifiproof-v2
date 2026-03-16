import { NextResponse } from "next/server";

import { getTrustedClientIp } from "@/lib/trusted-ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PrefixResponse = {
  ok: true;
  ip: string;
  suggestedPrefix: string;
  source: "request" | "ipify";
  family: "ipv4" | "ipv6" | "unknown";
  scope: "private" | "public" | "loopback" | "unknown";
};

function normalizeIp(ip: string) {
  return ip.replace(/^::ffff:/i, "").trim();
}

function isIpv4(ip: string) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip);
}

function isIpv6(ip: string) {
  return ip.includes(":");
}

function isLoopback(ip: string) {
  return ip === "127.0.0.1" || ip === "::1" || ip === "localhost";
}

function isPrivateIpv4(ip: string) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }

  if (parts[0] === 10) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  return false;
}

function describeScope(ip: string): PrefixResponse["scope"] {
  if (isLoopback(ip)) return "loopback";
  if (isIpv4(ip) && isPrivateIpv4(ip)) return "private";
  if (isIpv4(ip) || isIpv6(ip)) return "public";
  return "unknown";
}

function buildSuggestedPrefix(ip: string): string {
  if (isIpv4(ip)) {
    const parts = ip.split(".");
    return `${parts[0]}.${parts[1]}.${parts[2]}.`;
  }

  if (isIpv6(ip)) {
    const parts = ip.split(":").filter(Boolean);
    return parts.length >= 4 ? `${parts.slice(0, 4).join(":")}:` : ip;
  }

  return ip;
}

async function fetchPublicIpv4() {
  const response = await fetch("https://api.ipify.org?format=json", {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`ipify request failed with ${response.status}`);
  }

  const body = (await response.json()) as { ip?: string };
  if (!body.ip) {
    throw new Error("ipify response missing ip");
  }

  return normalizeIp(body.ip);
}

export async function GET(request: Request) {
  try {
    let source: PrefixResponse["source"] = "request";
    let ip = getTrustedClientIp(request);

    if (!ip || isLoopback(ip)) {
      ip = await fetchPublicIpv4();
      source = "ipify";
    }

    ip = normalizeIp(ip);

    const family: PrefixResponse["family"] = isIpv4(ip)
      ? "ipv4"
      : isIpv6(ip)
        ? "ipv6"
        : "unknown";

    return NextResponse.json({
      ok: true,
      ip,
      suggestedPrefix: buildSuggestedPrefix(ip),
      source,
      family,
      scope: describeScope(ip),
    } satisfies PrefixResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
