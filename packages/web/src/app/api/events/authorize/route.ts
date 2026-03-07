import { NextResponse } from "next/server";
import {
  createPublicClient,
  encodeAbiParameters,
  keccak256,
  toBytes,
  http,
} from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const VERIFIER_ABI = [
  {
    type: "function",
    name: "verify",
    stateMutability: "nonpayable",
    inputs: [
      { name: "proof", type: "bytes" },
      { name: "publicInputs", type: "bytes32[]" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const WIFIPROOF_AUTH_ABI = [
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "isOrganizer",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const FIELD_MODULUS =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

type AuthorizeRequest = {
  organizer: `0x${string}`;
  eventId: `0x${string}`;
  venueHash: `0x${string}`;
  startTime: number;
  endTime: number;
  venueName: string;
  deadline: number;
  subnetPrefix: string;
  proof: `0x${string}`;
  publicInputs: `0x${string}`[];
};

function getClientIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return null;
}

function eventIdToField(eventId: `0x${string}`) {
  const value = BigInt(eventId) % FIELD_MODULUS;
  return `0x${value.toString(16).padStart(64, "0")}` as `0x${string}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AuthorizeRequest;
    const {
      organizer,
      eventId,
      venueHash,
      startTime,
      endTime,
      venueName,
      deadline,
      subnetPrefix,
      proof,
      publicInputs,
    } = body;

    if (
      !organizer ||
      !eventId ||
      !venueHash ||
      !startTime ||
      !endTime ||
      !venueName ||
      !deadline ||
      !subnetPrefix ||
      !proof ||
      !publicInputs?.length
    ) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const clientIp = getClientIp(request);
    if (!clientIp || !clientIp.startsWith(subnetPrefix)) {
      return NextResponse.json({ error: "Not on venue subnet" }, { status: 403 });
    }

    const now = Math.floor(Date.now() / 1000);
    if (deadline < now || deadline > now + 600) {
      return NextResponse.json({ error: "Invalid deadline" }, { status: 400 });
    }

    if (publicInputs.length !== 4) {
      return NextResponse.json({ error: "Invalid public inputs" }, { status: 400 });
    }

    const eventIdField = eventIdToField(eventId);
    if (publicInputs[3].toLowerCase() !== eventIdField.toLowerCase()) {
      return NextResponse.json({ error: "Event ID mismatch" }, { status: 400 });
    }

    const encoded = encodeAbiParameters(
      [
        { type: "bytes32" },
        { type: "bytes32" },
        { type: "bytes32" },
        { type: "bytes32" },
      ],
      [publicInputs[0], publicInputs[1], publicInputs[2], publicInputs[3]]
    );
    const computedVenueHash = keccak256(encoded);
    if (computedVenueHash.toLowerCase() !== venueHash.toLowerCase()) {
      return NextResponse.json({ error: "Venue hash mismatch" }, { status: 403 });
    }

    const verifierAddress = process.env.VERIFIER_ADDRESS?.trim() as `0x${string}` | undefined;
    if (!verifierAddress) {
      return NextResponse.json({ error: "Missing VERIFIER_ADDRESS" }, { status: 500 });
    }

    const verifyingContract = process.env.WIFIPROOF_ADDRESS?.trim() as `0x${string}` | undefined;
    if (!verifyingContract) {
      return NextResponse.json({ error: "Missing WIFIPROOF_ADDRESS" }, { status: 500 });
    }

    const rpcUrl = process.env.BASE_RPC_URL?.trim();
    if (!rpcUrl) {
      return NextResponse.json({ error: "Missing BASE_RPC_URL" }, { status: 500 });
    }

    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(rpcUrl),
    });

    try {
      const [owner, allowlisted] = await Promise.all([
        publicClient.readContract({
          address: verifyingContract,
          abi: WIFIPROOF_AUTH_ABI,
          functionName: "owner",
        }),
        publicClient.readContract({
          address: verifyingContract,
          abi: WIFIPROOF_AUTH_ABI,
          functionName: "isOrganizer",
          args: [organizer],
        }),
      ]);

      const isOwner = owner.toLowerCase() === organizer.toLowerCase();
      if (!allowlisted && !isOwner) {
        return NextResponse.json({ error: "Organizer not allowlisted" }, { status: 403 });
      }
    } catch (err) {
      const allowlistError = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: "Organizer allowlist check failed", detail: allowlistError },
        { status: 400 }
      );
    }

    try {
      const isValid = await publicClient.readContract({
        address: verifierAddress,
        abi: VERIFIER_ABI,
        functionName: "verify",
        args: [proof, publicInputs],
      });

      if (!isValid) {
        return NextResponse.json({ error: "Invalid proof" }, { status: 403 });
      }
    } catch (err) {
      const verifyError = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: "Proof verification failed", detail: verifyError },
        { status: 400 }
      );
    }

    const privateKey = (
      (process.env.EVENT_SIGNER_PRIVATE_KEY?.trim() as `0x${string}` | undefined) ??
      (process.env.IP_SIGNER_PRIVATE_KEY?.trim() as `0x${string}` | undefined)
    );
    if (!privateKey) {
      return NextResponse.json({ error: "Signer not configured" }, { status: 500 });
    }

    const chainId = Number(process.env.CHAIN_ID?.trim() ?? 84532);

    const venueNameHash = keccak256(toBytes(venueName));

    const account = privateKeyToAccount(privateKey);
    const signature = await account.signTypedData({
      domain: {
        name: "WiFiProof",
        version: "2",
        chainId,
        verifyingContract,
      },
      types: {
        EventAuthorization: [
          { name: "organizer", type: "address" },
          { name: "eventId", type: "bytes32" },
          { name: "venueHash", type: "bytes32" },
          { name: "startTime", type: "uint64" },
          { name: "endTime", type: "uint64" },
          { name: "venueNameHash", type: "bytes32" },
          { name: "deadline", type: "uint64" },
        ],
      },
      primaryType: "EventAuthorization",
      message: {
        organizer,
        eventId,
        venueHash,
        startTime: BigInt(startTime),
        endTime: BigInt(endTime),
        venueNameHash,
        deadline: BigInt(deadline),
      },
    });

    return NextResponse.json({ signature });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[authorize] unexpected error:", msg, error);
    return NextResponse.json({ error: "Unexpected error", detail: msg }, { status: 500 });
  }
}
