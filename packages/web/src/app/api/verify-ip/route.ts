import { NextResponse } from "next/server";
import { privateKeyToAccount } from "viem/accounts";
import { hexToBytes } from "viem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VerifyIpRequest = {
  wallet: `0x${string}`;
  eventId: `0x${string}`;
  venueHash: `0x${string}`;
  deadline: number;
};

function getClientIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  return realIp ? realIp.trim() : null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyIpRequest;
    const { wallet, eventId, venueHash, deadline } = body;

    if (!wallet || !eventId || !venueHash || !deadline) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const privateKey = process.env.IP_SIGNER_PRIVATE_KEY as
      | `0x${string}`
      | undefined;
    if (!privateKey) {
      return NextResponse.json({ error: "Signer not configured" }, { status: 500 });
    }

    const expectedSubnet = process.env.VENUE_SUBNET_PREFIX; // e.g. "192.168.1"
    const clientIp = getClientIp(request);
    if (!clientIp || !expectedSubnet) {
      return NextResponse.json({ error: "IP validation unavailable" }, { status: 400 });
    }

    if (!clientIp.startsWith(expectedSubnet)) {
      return NextResponse.json({ error: "Not on venue subnet" }, { status: 403 });
    }

    const chainId = Number(process.env.CHAIN_ID ?? 84532);
    const verifyingContract = process.env.WIFIPROOF_ADDRESS as `0x${string}` | undefined;
    if (!verifyingContract) {
      return NextResponse.json({ error: "Missing WIFIPROOF_ADDRESS" }, { status: 500 });
    }

    const account = privateKeyToAccount(privateKey);
    const signature = await account.signTypedData({
      domain: {
        name: "WiFiProof",
        version: "2",
        chainId,
        verifyingContract,
      },
      types: {
        IPVerification: [
          { name: "wallet", type: "address" },
          { name: "eventId", type: "bytes32" },
          { name: "venueHash", type: "bytes32" },
          { name: "deadline", type: "uint64" },
        ],
      },
      primaryType: "IPVerification",
      message: {
        wallet,
        eventId,
        venueHash,
        deadline,
      },
    });

    return NextResponse.json({ signature });
  } catch (error) {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
