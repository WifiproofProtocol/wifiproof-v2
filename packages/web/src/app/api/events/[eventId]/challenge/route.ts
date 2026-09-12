import { createHash } from "node:crypto";

import { NextResponse } from "next/server";
import { isAddress, verifyMessage } from "viem";

import { challengeDisplayMessage, issueEventChallenge } from "@/lib/event-challenge";
import { getEventsSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  try {
    const { eventId: rawEventId } = await params;
    const eventId = rawEventId.toLowerCase();
    const body = (await request.json()) as { organizer?: string; issuedAt?: number; signature?: `0x${string}` };
    const organizer = body.organizer?.toLowerCase() ?? "";
    const issuedAt = Number(body.issuedAt);
    const now = Math.floor(Date.now() / 1000);
    if (!isAddress(organizer) || !Number.isInteger(issuedAt) || !body.signature || Math.abs(now - issuedAt) > 12 * 60 * 60) {
      return NextResponse.json({ error: "Valid organizer authorization is required" }, { status: 401 });
    }

    const validSignature = await verifyMessage({
      address: organizer as `0x${string}`,
      message: challengeDisplayMessage(eventId, organizer, issuedAt),
      signature: body.signature,
    });
    if (!validSignature) return NextResponse.json({ error: "Invalid organizer signature" }, { status: 401 });

    const supabase = getEventsSupabaseAdmin();
    const { data: event, error } = await supabase.from("events").select("organizer, end_time").eq("event_id", eventId).maybeSingle();
    if (error || !event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    if (String(event.organizer).toLowerCase() !== organizer) return NextResponse.json({ error: "Organizer does not own this event" }, { status: 403 });
    if (Number(event.end_time) + 300 < now) return NextResponse.json({ error: "Event has ended" }, { status: 410 });

    const issued = issueEventChallenge(eventId, now);
    await supabase.from("event_challenge_audit").upsert({
      event_id: eventId,
      slot: issued.challenge.slot,
      challenge_hash: issued.challengeHash,
      expires_at: new Date(issued.challenge.expiresAt * 1000).toISOString(),
    }, { onConflict: "event_id,slot", ignoreDuplicates: true });

    const origin = new URL(request.url).origin;
    const checkInUrl = `${origin}/event/${eventId}?challenge=${encodeURIComponent(issued.token)}`;
    return NextResponse.json({
      token: issued.token,
      checkInUrl,
      expiresAt: issued.challenge.expiresAt,
      fingerprint: createHash("sha256").update(issued.token).digest("hex").slice(0, 8),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Challenge could not be issued" }, { status: 500 });
  }
}
