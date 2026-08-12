import { createHash } from "node:crypto";

import { NextResponse } from "next/server";
import { createPublicClient, encodeAbiParameters, http, keccak256, type Hex } from "viem";
import { base, baseSepolia } from "viem/chains";

import { issueClaimStatusToken } from "@/lib/claim-status-token";
import { processClaimJob } from "@/lib/claim-worker";
import { verifyHumanityToken } from "@/lib/humanity";
import { signAttendanceAuthorization } from "@/lib/signer";
import { getEventsSupabaseAdmin } from "@/lib/supabase-admin";
import { requireBytes32 } from "@/lib/world";

const EVENT_ABI = [
  {
    type: "function",
    name: "events",
    stateMutability: "view",
    inputs: [{ name: "eventId", type: "bytes32" }],
    outputs: [
      { name: "storedEventId", type: "bytes32" },
      { name: "organizer", type: "address" },
      { name: "metadataHash", type: "bytes32" },
      { name: "venueCommitment", type: "bytes32" },
      { name: "startTime", type: "uint64" },
      { name: "endTime", type: "uint64" },
      { name: "requiredFactorBitmap", type: "uint32" },
      { name: "policyHash", type: "bytes32" },
    ],
  },
] as const;

const FIELD_MODULUS =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

type SubmitClaimRequest = {
  eventId: string;
  humanityToken: string;
  proof: Hex;
  publicInputs: `0x${string}`[];
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SubmitClaimRequest;
    const eventId = requireBytes32(body.eventId);
    const receipt = verifyHumanityToken(body.humanityToken);
    if (!receipt || receipt.provider !== "world" || receipt.eventId !== eventId) {
      return NextResponse.json({ error: "A current World ID receipt is required" }, { status: 403 });
    }
    if (!/^0x[0-9a-fA-F]+$/.test(body.proof ?? "") || body.proof.length > 500_000) {
      return NextResponse.json({ error: "Invalid proof payload" }, { status: 400 });
    }
    if (
      !Array.isArray(body.publicInputs) ||
      body.publicInputs.length !== 4 ||
      body.publicInputs.some((value) => !/^0x[0-9a-fA-F]{64}$/.test(value))
    ) {
      return NextResponse.json({ error: "Invalid public inputs" }, { status: 400 });
    }

    const contractAddress = process.env.WIFIPROOF_V2_ADDRESS?.trim() as `0x${string}` | undefined;
    const rpcUrl = process.env.BASE_RPC_URL?.trim();
    const chainId = Number(process.env.CHAIN_ID ?? 84532);
    if (!contractAddress || !rpcUrl || (chainId !== base.id && chainId !== baseSepolia.id)) {
      return NextResponse.json({ error: "V2 relay is not configured" }, { status: 503 });
    }
    const chain = chainId === base.id ? base : baseSepolia;
    const onchainEvent = await createPublicClient({ chain, transport: http(rpcUrl) }).readContract({
      address: contractAddress,
      abi: EVENT_ABI,
      functionName: "events",
      args: [eventId],
    });
    const [, organizer, , venueCommitment, startTime, endTime, requiredFactorBitmap, policyHash] = onchainEvent;
    if (organizer === "0x0000000000000000000000000000000000000000") {
      return NextResponse.json({ error: "Event is not registered in WiFiProof V2" }, { status: 404 });
    }
    const now = Math.floor(Date.now() / 1000);
    if (now < Number(startTime) || now > Number(endTime)) {
      return NextResponse.json({ error: "Event is not active" }, { status: 403 });
    }
    const eventField = `0x${(BigInt(eventId) % FIELD_MODULUS).toString(16).padStart(64, "0")}`;
    if (body.publicInputs[3].toLowerCase() !== eventField) {
      return NextResponse.json({ error: "Proof is bound to another event" }, { status: 403 });
    }
    const publicInputsHash = keccak256(
      encodeAbiParameters([{ type: "bytes32[]" }], [body.publicInputs]),
    );
    if (publicInputsHash.toLowerCase() !== venueCommitment.toLowerCase()) {
      return NextResponse.json({ error: "Proof venue does not match event policy" }, { status: 403 });
    }

    const supabase = getEventsSupabaseAdmin();
    const { data: evidence, error: evidenceError } = await supabase
      .from("attendance_evidence")
      .select("factor_bitmap, evidence_commitment, expires_at")
      .eq("event_id", eventId)
      .eq("attendance_nullifier", receipt.subjectHash)
      .maybeSingle();
    if (evidenceError || !evidence || Date.parse(evidence.expires_at) <= Date.now()) {
      return NextResponse.json({ error: "Complete the current venue evidence checks first" }, { status: 403 });
    }
    if ((Number(evidence.factor_bitmap) & Number(requiredFactorBitmap)) !== Number(requiredFactorBitmap)) {
      return NextResponse.json({ error: "The event's required factors are incomplete" }, { status: 403 });
    }

    const deadline = Math.min(Number(endTime), now + 5 * 60);
    const authorization = {
      eventId,
      attendanceNullifier: requireBytes32(receipt.subjectHash),
      factorBitmap: Number(evidence.factor_bitmap),
      evidenceCommitment: requireBytes32(evidence.evidence_commitment),
      publicInputsHash,
      policyHash: requireBytes32(policyHash),
      deadline,
      chainId,
      verifyingContract: contractAddress,
    };
    const signature = await signAttendanceAuthorization(authorization);
    const storedAuthorization = { ...authorization, signature };
    const proofHash = createHash("sha256").update(body.proof).digest("hex");
    const idempotencyKey = createHash("sha256")
      .update(`${eventId}:${receipt.subjectHash}:${proofHash}`)
      .digest("hex");

    await supabase
      .from("attendance_evidence")
      .update({ proof_hash: proofHash })
      .eq("event_id", eventId)
      .eq("attendance_nullifier", receipt.subjectHash);

    const insertPayload = {
      idempotency_key: idempotencyKey,
      event_id: eventId,
      attendance_nullifier: receipt.subjectHash,
      authorization: storedAuthorization,
      proof_hex: body.proof,
      public_inputs: body.publicInputs,
      status: "pending",
    };
    let { data: job, error: jobError } = await supabase
      .from("claim_jobs")
      .insert(insertPayload)
      .select("id, status, tx_hash, attestation_uid")
      .single();
    if (jobError?.code === "23505") {
      const existing = await supabase
        .from("claim_jobs")
        .select("id, status, tx_hash, attestation_uid")
        .eq("event_id", eventId)
        .eq("attendance_nullifier", receipt.subjectHash)
        .single();
      job = existing.data;
      jobError = existing.error;
    }
    if (jobError || !job) {
      return NextResponse.json({ error: "Claim job could not be created" }, { status: 500 });
    }

    let relayResult: Awaited<ReturnType<typeof processClaimJob>> | null = null;
    if (job.status === "pending" && process.env.RELAY_DISABLE_IMMEDIATE !== "true") {
      relayResult = await processClaimJob(job.id);
    }
    return NextResponse.json(
      {
        ok: true,
        jobId: job.id,
        statusToken: issueClaimStatusToken(job.id),
        status: relayResult?.status ?? job.status,
        transactionHash: relayResult?.status === "confirmed" ? relayResult.transactionHash : job.tx_hash,
        attestationUid: relayResult?.status === "confirmed" ? relayResult.attestationUid : job.attestation_uid,
      },
      { status: relayResult?.status === "confirmed" || job.status === "confirmed" ? 200 : 202 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Claim submission failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
