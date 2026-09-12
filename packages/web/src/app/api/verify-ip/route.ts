import { NextResponse } from "next/server";

import { getEventsSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyHumanityToken } from "@/lib/humanity";
import { checkRateLimit } from "@/lib/rateLimit";
import { signIPVerification } from "@/lib/signer";
import { getTrustedClientIp } from "@/lib/trusted-ip";
import { isIpInCidrs, normalizeCidrs, normalizeIpAddress } from "@/lib/ip-cidr";
import { verifyEventChallenge } from "@/lib/event-challenge";
import { evidenceCommitment, evidenceFingerprint, evidenceHash } from "@/lib/event-evidence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VerifyIpRequest = {
  wallet: `0x${string}`;
  eventId: `0x${string}`;
  venueHash: `0x${string}`;
  deadline: number;
  humanityToken: string;
  additionalHumanityTokens?: string[];
  challenge: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyIpRequest;
    const { wallet, eventId, venueHash, deadline, humanityToken, challenge } = body;

    if (!wallet || !eventId || !venueHash || !deadline || !humanityToken || !challenge) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const humanityClaims = verifyHumanityToken(humanityToken);
    if (!humanityClaims) {
      return NextResponse.json({ error: "Humanity verification required" }, { status: 403 });
    }
    if (humanityClaims.provider !== "world") {
      return NextResponse.json({ error: "World ID is required for every V2 attendance claim" }, { status: 403 });
    }

    const normalizedWallet = wallet.toLowerCase();
    const normalizedEventId = eventId.toLowerCase();
    const verifiedChallenge = verifyEventChallenge(challenge, normalizedEventId);
    if (!verifiedChallenge) {
      return NextResponse.json({ error: "Scan the current in-venue QR challenge" }, { status: 403 });
    }
    if (
      humanityClaims.wallet !== normalizedWallet ||
      humanityClaims.eventId !== normalizedEventId
    ) {
      return NextResponse.json(
        { error: "Humanity verification does not match wallet or event" },
        { status: 403 }
      );
    }

    const clientIp = getTrustedClientIp(request);
    const rateKey = `${normalizedWallet}:${clientIp ?? "unknown"}`;
    const rateWindowSeconds = Number(process.env.RATE_LIMIT_WINDOW_SECONDS ?? 120);
    const rateMax = Number(process.env.RATE_LIMIT_MAX ?? 5);
    const rateResult = await checkRateLimit(rateKey, rateMax, rateWindowSeconds * 1000);
    if (!rateResult.ok) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    if (!clientIp) {
      return NextResponse.json({ error: "IP validation unavailable" }, { status: 400 });
    }

    const supabase = getEventsSupabaseAdmin();
    const { data: eventRecord, error } = await supabase
      .from("events")
      .select("event_id, venue_hash, subnet_prefix, venue_cidrs, start_time, end_time, required_factor_bitmap")
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

    const configuredCidrs = Array.isArray(eventRecord.venue_cidrs) && eventRecord.venue_cidrs.length
      ? eventRecord.venue_cidrs.map(String)
      : normalizeCidrs(String(eventRecord.subnet_prefix || ""));
    if (!isIpInCidrs(clientIp, configuredCidrs)) {
      return NextResponse.json({ error: "Request did not use an approved venue network" }, { status: 403 });
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

    const requiredFactorBitmap = Number(eventRecord.required_factor_bitmap ?? 15);
    const additionalClaims = (body.additionalHumanityTokens ?? [])
      .map(verifyHumanityToken)
      .filter((claim): claim is NonNullable<typeof claim> => Boolean(claim));
    if (
      additionalClaims.some(
        (claim) => claim.wallet !== normalizedWallet || claim.eventId !== normalizedEventId,
      )
    ) {
      return NextResponse.json({ error: "Additional humanity receipt does not match this claim" }, { status: 403 });
    }
    const additionalProviders = new Set(additionalClaims.map((claim) => claim.provider));
    if ((requiredFactorBitmap & 16) !== 0 && !additionalProviders.has("self")) {
      return NextResponse.json({ error: "This event also requires Self verification" }, { status: 403 });
    }
    if ((requiredFactorBitmap & 32) !== 0 && !additionalProviders.has("coinbase")) {
      return NextResponse.json({ error: "This event also requires Coinbase verification" }, { status: 403 });
    }

    let verifiedFactorBitmap = 15;
    if (additionalProviders.has("self")) verifiedFactorBitmap |= 16;
    if (additionalProviders.has("coinbase")) verifiedFactorBitmap |= 32;
    const networkFingerprint = evidenceFingerprint("network", normalizeIpAddress(clientIp));
    const challengeHash = evidenceHash(challenge);
    const commitment = evidenceCommitment([
      normalizedEventId,
      humanityClaims.subjectHash,
      networkFingerprint,
      challengeHash,
      String(verifiedFactorBitmap),
      ...additionalClaims.map((claim) => claim.subjectHash).sort(),
    ]);

    const { error: evidenceError } = await supabase.from("attendance_evidence").upsert(
      {
        event_id: normalizedEventId,
        attendance_nullifier: humanityClaims.subjectHash,
        factor_bitmap: verifiedFactorBitmap,
        network_fingerprint: networkFingerprint,
        challenge_hash: challengeHash,
        evidence_commitment: commitment,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: "event_id,attendance_nullifier" },
    );
    if (evidenceError) {
      return NextResponse.json({ error: "Attendance evidence could not be persisted" }, { status: 500 });
    }

    // The immutable V2 path consumes the derived evidence below and receives a
    // separate attendance authorization after the Noir proof is generated.
    // Keep the old IP signature only for prototype deployments.
    const chainId = Number(process.env.CHAIN_ID?.trim() ?? 84532);
    const verifyingContract = process.env.WIFIPROOF_ADDRESS?.trim() as `0x${string}` | undefined;
    const v2Contract = process.env.WIFIPROOF_V2_ADDRESS?.trim();
    if (!verifyingContract && !v2Contract) {
      return NextResponse.json({ error: "No WiFiProof contract is configured" }, { status: 500 });
    }

    const signature = !v2Contract && verifyingContract
      ? await signIPVerification({
          wallet,
          eventId,
          venueHash,
          deadline,
          chainId,
          verifyingContract,
        })
      : undefined;

    return NextResponse.json({
      signature,
      evidence: {
        attendanceNullifier: humanityClaims.subjectHash,
        factorBitmap: verifiedFactorBitmap,
        evidenceCommitment: commitment,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
