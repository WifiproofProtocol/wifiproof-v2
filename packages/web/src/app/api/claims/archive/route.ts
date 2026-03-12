import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  uploadAttendanceArtifact,
  type AttendanceArtifactPayload,
} from "@/lib/storacha";

type ArchiveRequest = {
  eventId: `0x${string}`;
  wallet: `0x${string}`;
  txHash: `0x${string}`;
  attestationUid: `0x${string}`;
  proofHash: `0x${string}`;
  publicInputsHash: `0x${string}`;
  worldNullifierHash?: `0x${string}`;
  network?: string;
};

const ADDRESS_RE = /^0x[0-9a-f]{40}$/;
const BYTES32_RE = /^0x[0-9a-f]{64}$/;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function validOptionalHex(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[0-9a-f]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ArchiveRequest;

    const eventId = typeof body.eventId === "string" ? normalize(body.eventId) : "";
    const wallet = typeof body.wallet === "string" ? normalize(body.wallet) : "";
    const txHash = typeof body.txHash === "string" ? normalize(body.txHash) : "";
    const attestationUid =
      typeof body.attestationUid === "string" ? normalize(body.attestationUid) : "";
    const proofHash = typeof body.proofHash === "string" ? normalize(body.proofHash) : "";
    const publicInputsHash =
      typeof body.publicInputsHash === "string"
        ? normalize(body.publicInputsHash)
        : "";

    if (
      !BYTES32_RE.test(eventId) ||
      !ADDRESS_RE.test(wallet) ||
      !BYTES32_RE.test(txHash) ||
      !BYTES32_RE.test(attestationUid) ||
      !BYTES32_RE.test(proofHash) ||
      !BYTES32_RE.test(publicInputsHash)
    ) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const worldNullifierHash =
      body.worldNullifierHash && validOptionalHex(normalize(body.worldNullifierHash))
        ? normalize(body.worldNullifierHash)
        : undefined;

    const payload: AttendanceArtifactPayload = {
      eventId: eventId as `0x${string}`,
      wallet: wallet as `0x${string}`,
      txHash: txHash as `0x${string}`,
      attestationUid: attestationUid as `0x${string}`,
      proofHash: proofHash as `0x${string}`,
      publicInputsHash: publicInputsHash as `0x${string}`,
      worldNullifierHash: worldNullifierHash as `0x${string}` | undefined,
      network: body.network?.trim() || "base-sepolia",
      timestamp: Math.floor(Date.now() / 1000),
    };

    const supabase = getSupabaseAdmin();
    const { data: existingEvent, error: eventLookupError } = await supabase
      .from("events")
      .select("event_id")
      .eq("event_id", payload.eventId)
      .maybeSingle();

    if (eventLookupError) {
      console.error("[claims/archive] Event lookup failed", {
        eventId: payload.eventId,
        message: eventLookupError.message,
        code: eventLookupError.code,
      });
      return NextResponse.json(
        { error: "Failed to validate event", detail: eventLookupError.message },
        { status: 500 }
      );
    }

    if (!existingEvent) {
      console.warn("[claims/archive] Event not found", { eventId: payload.eventId });
      return NextResponse.json(
        { error: "Event not found for artifact archive", detail: "Create event first, then archive." },
        { status: 404 }
      );
    }

    let cid = "";
    try {
      cid = await uploadAttendanceArtifact(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Storacha upload failed";
      console.error("[claims/archive] Storacha upload failed", {
        eventId: payload.eventId,
        wallet: payload.wallet,
        message,
      });
      return NextResponse.json(
        { error: "Failed to upload artifact", detail: message },
        { status: 500 }
      );
    }

    const { error } = await supabase.from("attendance_artifacts").insert({
      event_id: payload.eventId,
      wallet: payload.wallet,
      tx_hash: payload.txHash,
      attestation_uid: payload.attestationUid,
      proof_hash: payload.proofHash,
      public_inputs_hash: payload.publicInputsHash,
      world_nullifier_hash: payload.worldNullifierHash ?? null,
      cid,
      network: payload.network,
    });

    if (error) {
      console.error("[claims/archive] Supabase insert failed", {
        eventId: payload.eventId,
        wallet: payload.wallet,
        message: error.message,
        code: error.code,
      });
      return NextResponse.json(
        {
          error: "Failed to persist artifact",
          detail: error.message,
          code: error.code,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, cid });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unexpected error";
    console.error("[claims/archive] Unexpected failure", { message: msg });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
