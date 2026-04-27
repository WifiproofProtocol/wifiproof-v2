import { NextResponse } from "next/server";
import { DefaultConfigStore, SelfBackendVerifier } from "@selfxyz/core";

import { issueHumanityToken } from "@/lib/humanity";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { requireAddress, requireBytes32 } from "@/lib/world";

type SelfProof = {
  a: [string | number, string | number];
  b: [[string | number, string | number], [string | number, string | number]];
  c: [string | number, string | number];
};

type SelfVerificationRequest = {
  attestationId: number;
  proof: SelfProof;
  publicSignals?: Array<string | number>;
  pubSignals?: Array<string | number>;
  userContextData: string;
};

const SELF_ALLOWED_IDS = new Map<1 | 2 | 3 | 4, boolean>([
  [1, true],
  [2, true],
  [3, true],
  [4, true],
]);

const SELF_SESSION_WINDOW_MS = 60 * 60 * 1000;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isEnabled(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function getSelfScope() {
  return (
    process.env.SELF_SCOPE?.trim() ??
    process.env.NEXT_PUBLIC_SELF_SCOPE?.trim() ??
    "wifiproof-humanity"
  );
}

function getSelfEndpoint(request: Request) {
  return new URL("/api/humanity/self", request.url).toString();
}

function getVerifier(request: Request) {
  return new SelfBackendVerifier(
    getSelfScope(),
    getSelfEndpoint(request),
    isEnabled(process.env.SELF_MOCK_PASSPORT),
    SELF_ALLOWED_IDS,
    new DefaultConfigStore({
      ofac: true,
    }),
    "hex"
  );
}

function getSignals(body: SelfVerificationRequest) {
  const signals = body.publicSignals ?? body.pubSignals;
  if (!Array.isArray(signals) || signals.length === 0) {
    throw new Error("Missing Self public signals");
  }
  return signals;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const wallet = requireAddress(url.searchParams.get("wallet") ?? "");
    const eventId = requireBytes32(url.searchParams.get("eventId") ?? "");

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("self_verifications")
      .select("verified_at")
      .eq("event_id", eventId)
      .eq("wallet", wallet)
      .order("verified_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "Failed to look up Self verification", detail: error.message },
        { status: 500 }
      );
    }

    if (!data?.verified_at) {
      return NextResponse.json(
        { error: "No recent Self verification was found for this wallet and event." },
        { status: 404 }
      );
    }

    const verifiedAtMs = Date.parse(data.verified_at);
    if (!Number.isFinite(verifiedAtMs) || Date.now() - verifiedAtMs > SELF_SESSION_WINDOW_MS) {
      return NextResponse.json(
        { error: "The Self verification session expired. Start a new verification." },
        { status: 410 }
      );
    }

    const { token, claims } = issueHumanityToken({
      wallet,
      eventId,
      provider: "self",
    });

    return NextResponse.json({
      ok: true,
      token,
      provider: "self",
      expiresAt: claims.exp,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SelfVerificationRequest;
    if (!body.attestationId || !body.proof || !body.userContextData) {
      return NextResponse.json({
        status: "error",
        result: false,
        reason: "Proof, publicSignals, attestationId and userContextData are required",
      });
    }

    if (![1, 2, 3, 4].includes(body.attestationId)) {
      return NextResponse.json({
        status: "error",
        result: false,
        reason: "Unsupported Self attestation type",
      });
    }

    const verifier = getVerifier(request);
    const verification = await verifier.verify(
      body.attestationId as 1 | 2 | 3 | 4,
      body.proof,
      getSignals(body),
      body.userContextData
    );

    if (!verification.isValidDetails.isValid) {
      return NextResponse.json({
        status: "error",
        result: false,
        reason: "Self verification failed",
        detail: verification.isValidDetails,
      });
    }

    const wallet = requireAddress(verification.userData.userIdentifier);
    const eventId = requireBytes32(verification.userData.userDefinedData);
    const nullifier = String(verification.discloseOutput.nullifier ?? "").trim().toLowerCase();

    if (!nullifier) {
      return NextResponse.json({
        status: "error",
        result: false,
        reason: "Self verification missing nullifier",
      });
    }

    const supabase = getSupabaseAdmin();
    const insertPayload = {
      event_id: eventId,
      wallet,
      nullifier,
      attestation_id: verification.attestationId,
      scope: getSelfScope(),
      user_identifier: verification.userData.userIdentifier,
      user_defined_data: verification.userData.userDefinedData,
      proof_json: body,
      disclose_output: verification.discloseOutput,
    };

    const { error: insertError } = await supabase
      .from("self_verifications")
      .insert(insertPayload);

    if (insertError) {
      if (insertError.code === "23505") {
        const { data: existing, error: existingError } = await supabase
          .from("self_verifications")
          .select("wallet")
          .eq("event_id", eventId)
          .eq("nullifier", nullifier)
          .maybeSingle();

        if (existingError) {
          return NextResponse.json({
            status: "error",
            result: false,
            reason: "Failed to confirm existing Self verification",
          });
        }

        if (!existing || existing.wallet !== wallet) {
          return NextResponse.json({
            status: "error",
            result: false,
            reason: "This Self identity has already been used for this event",
          });
        }
      } else {
        return NextResponse.json({
          status: "error",
          result: false,
          reason: "Failed to persist Self verification",
          detail: insertError.message,
        });
      }
    }

    return NextResponse.json({ status: "success", result: true, provider: "self" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({
      status: "error",
      result: false,
      reason: message,
    });
  }
}
