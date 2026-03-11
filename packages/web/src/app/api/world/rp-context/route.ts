import { NextResponse } from "next/server";
import { signRequest } from "@worldcoin/idkit/signing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RpContextRequest = {
  action?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as RpContextRequest;

    const rpId =
      process.env.RP_ID?.trim() ??
      process.env.WORLD_RP_ID?.trim() ??
      process.env.NEXT_PUBLIC_WORLD_RP_ID?.trim();

    if (!rpId) {
      return NextResponse.json({ error: "Missing RP_ID" }, { status: 500 });
    }

    const signingKey =
      process.env.RP_SIGNING_KEY?.trim() ?? process.env.WORLD_SIGNER_PRIVATE_KEY?.trim();
    if (!signingKey) {
      return NextResponse.json({ error: "Missing RP_SIGNING_KEY" }, { status: 500 });
    }

    const envAction =
      process.env.WORLD_ACTION_ID?.trim() ?? process.env.NEXT_PUBLIC_WORLD_ACTION_ID?.trim();
    const action = body.action?.trim() || envAction;

    if (!action) {
      return NextResponse.json({ error: "Missing action" }, { status: 500 });
    }

    const ttl = Number(process.env.WORLD_RP_TTL_SECONDS ?? 300);
    const signature = signRequest(action, signingKey, Number.isFinite(ttl) ? ttl : 300);

    return NextResponse.json({
      rp_context: {
        rp_id: rpId,
        nonce: signature.nonce,
        created_at: signature.createdAt,
        expires_at: signature.expiresAt,
        signature: signature.sig,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
