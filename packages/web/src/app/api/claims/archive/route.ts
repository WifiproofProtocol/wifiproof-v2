import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  uploadAttendanceArtifact,
  type AttendanceArtifactPayload,
} from "@/lib/storacha";
import { verifyAttendanceClaimTransaction } from "@/lib/wifiproof-chain";

type ArchiveRequest = {
  eventId: `0x${string}`;
  wallet: `0x${string}`;
  txHash: `0x${string}`;
  attestationUid: `0x${string}`;
  proofHash: `0x${string}`;
  publicInputsHash: `0x${string}`;
  network?: string;
};

const ADDRESS_RE = /^0x[0-9a-f]{40}$/;
const BYTES32_RE = /^0x[0-9a-f]{64}$/;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalize(value: string) {
  return value.trim().toLowerCase();
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

    const payload: AttendanceArtifactPayload = {
      eventId: eventId as `0x${string}`,
      wallet: wallet as `0x${string}`,
      txHash: txHash as `0x${string}`,
      attestationUid: attestationUid as `0x${string}`,
      proofHash: proofHash as `0x${string}`,
      publicInputsHash: publicInputsHash as `0x${string}`,
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

    try {
      await verifyAttendanceClaimTransaction({
        txHash: payload.txHash,
        wallet: payload.wallet,
        eventId: payload.eventId,
        attestationUid: payload.attestationUid,
        proofHash: payload.proofHash,
        publicInputsHash: payload.publicInputsHash,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Attendance claim verification failed";
      return NextResponse.json(
        { error: "Attendance claim verification failed", detail: message },
        { status: 403 }
      );
    }

    const { data: existingArtifact, error: artifactLookupError } = await supabase
      .from("attendance_artifacts")
      .select(
        "event_id, wallet, tx_hash, attestation_uid, proof_hash, public_inputs_hash, cid, network"
      )
      .eq("tx_hash", payload.txHash)
      .maybeSingle();

    if (artifactLookupError) {
      return NextResponse.json(
        { error: "Failed to check existing artifact", detail: artifactLookupError.message },
        { status: 500 }
      );
    }

    if (existingArtifact) {
      const matchesExisting =
        existingArtifact.event_id === payload.eventId &&
        existingArtifact.wallet === payload.wallet &&
        existingArtifact.tx_hash === payload.txHash &&
        existingArtifact.attestation_uid === payload.attestationUid &&
        existingArtifact.proof_hash === payload.proofHash &&
        existingArtifact.public_inputs_hash === payload.publicInputsHash &&
        existingArtifact.network === payload.network;

      if (!matchesExisting) {
        return NextResponse.json(
          { error: "Artifact already exists with different values" },
          { status: 409 }
        );
      }

      return NextResponse.json({ ok: true, cid: existingArtifact.cid });
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
