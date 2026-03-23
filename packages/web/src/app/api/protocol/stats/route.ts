import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const [eventsResult, attestationsResult, worldResult, latestArtifactResult] =
      await Promise.all([
        supabase.from("events").select("*", { count: "exact", head: true }),
        supabase
          .from("attendance_artifacts")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("world_verifications")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("attendance_artifacts")
          .select("event_id, wallet, attestation_uid, created_at")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    if (eventsResult.error || attestationsResult.error || worldResult.error || latestArtifactResult.error) {
      return NextResponse.json({ error: "Stats lookup failed" }, { status: 500 });
    }

    let latestAttestation: {
      eventId: string;
      eventName: string | null;
      wallet: string;
      attestationUid: string;
      createdAt: string | null;
      easScanUrl: string;
    } | null = null;

    const latestArtifact = latestArtifactResult.data;
    if (latestArtifact) {
      const { data: eventRow } = await supabase
        .from("events")
        .select("venue_name")
        .eq("event_id", latestArtifact.event_id)
        .maybeSingle();

      latestAttestation = {
        eventId: latestArtifact.event_id,
        eventName: eventRow?.venue_name ?? null,
        wallet: latestArtifact.wallet,
        attestationUid: latestArtifact.attestation_uid,
        createdAt: latestArtifact.created_at ?? null,
        easScanUrl: `https://base-sepolia.easscan.org/attestation/view/${latestArtifact.attestation_uid}`,
      };
    }

    return NextResponse.json({
      stats: {
        eventsCount: eventsResult.count ?? 0,
        attestationsCount: attestationsResult.count ?? 0,
        humanityChecksCount: worldResult.count ?? 0,
      },
      latestAttestation,
    });
  } catch {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
