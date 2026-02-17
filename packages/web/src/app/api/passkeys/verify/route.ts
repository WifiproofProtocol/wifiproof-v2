import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PasskeyVerifyRequest = {
  wallet: `0x${string}`;
  credentialId: string;
  clientDataJSON: string;
  authenticatorData: string;
  signature: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PasskeyVerifyRequest;
    const { wallet, credentialId } = body;

    if (!wallet || !credentialId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // TODO: Verify WebAuthn assertion and bind passkey to wallet.
    // For now, this is a stub to unblock integration.
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
