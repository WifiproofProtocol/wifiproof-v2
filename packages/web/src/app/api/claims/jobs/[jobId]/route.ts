import { NextResponse } from "next/server";

import { verifyClaimStatusToken } from "@/lib/claim-status-token";
import { getEventsSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(jobId) || !verifyClaimStatusToken(jobId, token)) {
    return NextResponse.json({ error: "Invalid claim status token" }, { status: 403 });
  }
  const { data, error } = await getEventsSupabaseAdmin()
    .from("claim_jobs")
    .select("status, tx_hash, attestation_uid, last_error, updated_at")
    .eq("id", jobId)
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Claim job not found" }, { status: 404 });
  return NextResponse.json({
    status: data.status,
    transactionHash: data.tx_hash,
    attestationUid: data.attestation_uid,
    error: data.status === "failed" ? data.last_error : null,
    updatedAt: data.updated_at,
  });
}
