import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { checkRateLimit } from "@/lib/rateLimit";
import { signIPVerification } from "@/lib/signer";
import { getTrustedClientIp } from "@/lib/trusted-ip";
import { verifyWorldToken } from "@/lib/world";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VerifyIpRequest = {
  wallet: `0x${string}`;
  eventId: `0x${string}`;
  venueHash: `0x${string}`;
  deadline: number;
  worldToken: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyIpRequest;
    const { wallet, eventId, venueHash, deadline, worldToken } = body;

    if (!wallet || !eventId || !venueHash || !deadline || !worldToken) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const worldClaims = verifyWorldToken(worldToken);
    if (!worldClaims) {
      return NextResponse.json({ error: "World verification required" }, { status: 403 });
    }

    const normalizedWallet = wallet.toLowerCase();
    const normalizedEventId = eventId.toLowerCase();
    if (
      worldClaims.wallet !== normalizedWallet ||
      worldClaims.eventId !== normalizedEventId
    ) {
      return NextResponse.json(
        { error: "World verification does not match wallet or event" },
        { status: 403 }
      );
    }

    const clientIp = getTrustedClientIp(request);
    const rateKey = `${normalizedWallet}:${clientIp ?? "unknown"}`;
    const rateWindowSeconds = Number(process.env.RATE_LIMIT_WINDOW_SECONDS ?? 120);
    const rateMax = Number(process.env.RATE_LIMIT_MAX ?? 5);
    const rateResult = checkRateLimit(rateKey, rateMax, rateWindowSeconds * 1000);
    if (!rateResult.ok) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    if (!clientIp) {
      return NextResponse.json({ error: "IP validation unavailable" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: eventRecord, error } = await supabase
      .from("events")
      .select("event_id, venue_hash, subnet_prefix, start_time, end_time")
      .eq("event_id", normalizedEventId)
      .maybeSingle();

    if (error) {
      console.error("[verify-ip] Supabase event lookup error:", error);
      return NextResponse.json({ error: "Event lookup failed" }, { status: 500 });
    }
    if (!eventRecord) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const storedVenueHash = String(eventRecord.venue_hash || "").toLowerCase();
    if (storedVenueHash !== venueHash.toLowerCase()) {
      return NextResponse.json({ error: "Venue hash mismatch" }, { status: 403 });
    }

    const expectedSubnet = String(eventRecord.subnet_prefix || "").trim();
    if (!expectedSubnet || !clientIp.startsWith(expectedSubnet)) {
      return NextResponse.json({ error: "Not on venue subnet" }, { status: 403 });
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const maxDeadline = nowSeconds + 120;
    if (deadline < nowSeconds || deadline > maxDeadline) {
      return NextResponse.json({ error: "Invalid deadline" }, { status: 400 });
    }

    if (eventRecord.start_time && nowSeconds < Number(eventRecord.start_time)) {
      return NextResponse.json({ error: "Event not active" }, { status: 403 });
    }
    if (eventRecord.end_time && nowSeconds > Number(eventRecord.end_time)) {
      return NextResponse.json({ error: "Event not active" }, { status: 403 });
    }

    const chainId = Number(process.env.CHAIN_ID?.trim() ?? 84532);
    const verifyingContract = process.env.WIFIPROOF_ADDRESS?.trim() as `0x${string}` | undefined;
    if (!verifyingContract) {
      return NextResponse.json({ error: "Missing WIFIPROOF_ADDRESS" }, { status: 500 });
    }

    const signature = await signIPVerification({
      wallet,
      eventId,
      venueHash,
      deadline,
      chainId,
      verifyingContract,
    });

    return NextResponse.json({ signature });
  } catch {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
