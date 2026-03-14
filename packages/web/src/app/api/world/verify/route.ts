import { NextResponse } from "next/server";
import { hashSignal } from "@worldcoin/idkit/hashing";

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  issueWorldToken,
  verifyWorldResultOnServer,
  type WorldIDKitResult,
} from "@/lib/world";

type VerifyWorldRequest = {
  wallet: `0x${string}`;
  eventId: `0x${string}`;
  idkitResult: WorldIDKitResult;
};

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const BYTES32_RE = /^0x[0-9a-fA-F]{64}$/;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyWorldRequest;
    const wallet = typeof body.wallet === "string" ? normalize(body.wallet) : "";
    const eventId = typeof body.eventId === "string" ? normalize(body.eventId) : "";

    if (!ADDRESS_RE.test(wallet) || !BYTES32_RE.test(eventId) || !body.idkitResult) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const verification = await verifyWorldResultOnServer({
      wallet,
      eventId,
      idkitResult: body.idkitResult,
    });

    const signalHash = verification.signalHash;
    if (signalHash) {
      const expectedSignalHash = hashSignal(wallet).toLowerCase();
      if (signalHash.toLowerCase() !== expectedSignalHash) {
        return NextResponse.json(
          { error: "World signal does not match wallet address" },
          { status: 403 }
        );
      }
    }

    const supabase = getSupabaseAdmin();
    const insertPayload = {
      event_id: eventId,
      wallet,
      nullifier_hash: verification.nullifierHash,
      verification_level: verification.verificationLevel,
      proof_json: body.idkitResult,
    };

    const { error: insertError } = await supabase
      .from("world_verifications")
      .insert(insertPayload);

    if (insertError) {
      // 23505 = unique_violation (event_id, nullifier_hash)
      if (insertError.code === "23505") {
        const { data: existing, error: existingError } = await supabase
          .from("world_verifications")
          .select("wallet")
          .eq("event_id", eventId)
          .eq("nullifier_hash", verification.nullifierHash)
          .maybeSingle();

        if (existingError) {
          return NextResponse.json(
            { error: "Failed to confirm existing verification" },
            { status: 500 }
          );
        }

        if (!existing || existing.wallet !== wallet) {
          return NextResponse.json(
            { error: "This World ID has already been used for this event" },
            { status: 409 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "Failed to persist World verification", detail: insertError.message },
          { status: 500 }
        );
      }
    }

    const tokenTtlSeconds = Number(process.env.WORLD_TOKEN_TTL_SECONDS ?? 900);
    const { token, claims } = issueWorldToken({
      wallet,
      eventId,
      nullifierHash: verification.nullifierHash,
      ttlSeconds: tokenTtlSeconds,
    });

    return NextResponse.json({
      ok: true,
      token,
      expiresAt: claims.exp,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
