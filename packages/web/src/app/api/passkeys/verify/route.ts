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

    return NextResponse.json(
      { error: "Passkey verification is not implemented on the server" },
      { status: 501 }
    );
  } catch {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
