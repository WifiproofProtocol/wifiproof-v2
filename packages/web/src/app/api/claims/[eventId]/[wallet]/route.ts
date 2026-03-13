import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase-admin";

const ADDRESS_RE = /^0x[0-9a-f]{40}$/;
const BYTES32_RE = /^0x[0-9a-f]{64}$/;

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  {
    params,
  }: { params: Promise<{ eventId: string; wallet: string }> }
) {
  try {
    const parsed = await params;
    const eventId = normalize(parsed.eventId);
    const wallet = normalize(parsed.wallet);

    if (!BYTES32_RE.test(eventId) || !ADDRESS_RE.test(wallet)) {
      return NextResponse.json({ error: "Invalid eventId or wallet" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("attendance_artifacts")
      .select(
        "event_id, wallet, tx_hash, attestation_uid, proof_hash, public_inputs_hash, cid, network, created_at"
      )
      .eq("event_id", eventId)
      .eq("wallet", wallet)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Lookup failed", detail: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
    }

    return NextResponse.json({ artifact: data });
  } catch {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
