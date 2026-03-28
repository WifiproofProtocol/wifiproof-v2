import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAttendanceClaimStats } from "@/lib/wifiproof-chain";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const [eventsResult, worldResult, archivedClaimsResult, latestArtifactResult] =
      await Promise.all([
        supabase.from("events").select("*", { count: "exact", head: true }),
        supabase
          .from("world_verifications")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("attendance_artifacts")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("attendance_artifacts")
          .select("event_id, wallet, attestation_uid, created_at")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    if (eventsResult.error || worldResult.error || archivedClaimsResult.error || latestArtifactResult.error) {
      return NextResponse.json({ error: "Stats lookup failed" }, { status: 500 });
    }

    let attendanceStats: Awaited<ReturnType<typeof getAttendanceClaimStats>> = {
      count: archivedClaimsResult.count ?? 0,
      latest: latestArtifactResult.data
        ? {
            wallet: latestArtifactResult.data.wallet as `0x${string}`,
            eventId: latestArtifactResult.data.event_id as `0x${string}`,
            attestationUid: latestArtifactResult.data.attestation_uid as `0x${string}`,
            timestamp: latestArtifactResult.data.created_at ?? null,
          }
        : null,
    };

    try {
      attendanceStats = await getAttendanceClaimStats();
    } catch (error) {
      console.error("Failed to fetch on-chain attendance stats", error);
    }

    let latestAttestation: {
      eventId: string;
      eventName: string | null;
      wallet: string;
      attestationUid: string;
      createdAt: string | null;
      easScanUrl: string;
    } | null = null;

    const latestClaim = attendanceStats.latest;
    if (latestClaim) {
      const { data: eventRow } = await supabase
        .from("events")
        .select("venue_name")
        .eq("event_id", latestClaim.eventId)
        .maybeSingle();

      latestAttestation = {
        eventId: latestClaim.eventId,
        eventName: eventRow?.venue_name ?? null,
        wallet: latestClaim.wallet,
        attestationUid: latestClaim.attestationUid,
        createdAt: latestClaim.timestamp,
        easScanUrl: `https://base-sepolia.easscan.org/attestation/view/${latestClaim.attestationUid}`,
      };
    }

    return NextResponse.json({
      stats: {
        eventsCount: eventsResult.count ?? 0,
        attestationsCount: attendanceStats.count,
        humanityChecksCount: worldResult.count ?? 0,
      },
      latestAttestation,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
