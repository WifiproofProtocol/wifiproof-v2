import { NextResponse } from "next/server";
import { createPublicClient, decodeEventLog, decodeFunctionData, http, type Hex } from "viem";
import { base, baseSepolia } from "viem/chains";

import { computeEventMetadataHash } from "@/lib/event-policy";
import { isIpInCidrs, normalizeCidrs } from "@/lib/ip-cidr";
import { getEventsSupabaseAdmin } from "@/lib/supabase-admin";
import { getTrustedClientIp } from "@/lib/trusted-ip";
import { requireAddress, requireBytes32 } from "@/lib/world";

const V2_EVENT_ABI = [
  {
    type: "function",
    name: "createEvent",
    stateMutability: "nonpayable",
    inputs: [
      { name: "eventId", type: "bytes32" },
      { name: "metadataHash", type: "bytes32" },
      { name: "venueCommitment", type: "bytes32" },
      { name: "startTime", type: "uint64" },
      { name: "endTime", type: "uint64" },
      { name: "requiredFactorBitmap", type: "uint32" },
    ],
    outputs: [{ name: "policyHash", type: "bytes32" }],
  },
  {
    type: "event",
    name: "EventCreated",
    inputs: [
      { indexed: true, name: "eventId", type: "bytes32" },
      { indexed: true, name: "organizer", type: "address" },
      { indexed: true, name: "policyHash", type: "bytes32" },
      { indexed: false, name: "metadataHash", type: "bytes32" },
      { indexed: false, name: "venueCommitment", type: "bytes32" },
      { indexed: false, name: "startTime", type: "uint64" },
      { indexed: false, name: "endTime", type: "uint64" },
      { indexed: false, name: "requiredFactorBitmap", type: "uint32" },
      { indexed: false, name: "feePaid", type: "uint256" },
    ],
  },
] as const;

type CreateV2Body = {
  organizer: string;
  eventId: string;
  venueCommitment: string;
  startTime: number;
  endTime: number;
  requiredFactorBitmap: number;
  venueName: string;
  eventDescription?: string;
  venueLat: number;
  venueLon: number;
  radiusMeters: number;
  venueCidr: string;
  posterImageUrl?: string;
  txHash: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateV2Body;
    const organizer = requireAddress(body.organizer);
    const eventId = requireBytes32(body.eventId);
    const venueCommitment = requireBytes32(body.venueCommitment);
    const txHash = requireBytes32(body.txHash) as Hex;
    const venueCidr = normalizeCidrs(body.venueCidr)[0];
    const venueName = body.venueName?.trim();
    const eventDescription = body.eventDescription?.trim() ?? "";
    const posterImageUrl = body.posterImageUrl?.trim() ?? "";
    if (
      !venueName || eventDescription.length > 500 || posterImageUrl.length > 900_000 ||
      !Number.isInteger(body.startTime) || !Number.isInteger(body.endTime) || body.startTime >= body.endTime ||
      !Number.isFinite(body.venueLat) || !Number.isFinite(body.venueLon) ||
      !Number.isInteger(body.radiusMeters) || body.radiusMeters < 1 || body.radiusMeters > 10_000 ||
      (body.requiredFactorBitmap & 15) !== 15
    ) return NextResponse.json({ error: "Invalid event metadata" }, { status: 400 });

    const clientIp = getTrustedClientIp(request);
    if (!clientIp || !isIpInCidrs(clientIp, [venueCidr])) {
      return NextResponse.json({ error: "Activate the event from its venue network" }, { status: 403 });
    }
    const contract = process.env.WIFIPROOF_V2_ADDRESS?.trim() as `0x${string}` | undefined;
    const rpcUrl = process.env.BASE_RPC_URL?.trim();
    const chainId = Number(process.env.CHAIN_ID ?? 84532);
    if (!contract || !rpcUrl || (chainId !== base.id && chainId !== baseSepolia.id)) {
      return NextResponse.json({ error: "WiFiProof V2 is not configured" }, { status: 503 });
    }
    const chain = chainId === base.id ? base : baseSepolia;
    const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
    const [transaction, receipt] = await Promise.all([
      publicClient.getTransaction({ hash: txHash }),
      publicClient.getTransactionReceipt({ hash: txHash }),
    ]);
    if (
      receipt.status !== "success" || transaction.to?.toLowerCase() !== contract.toLowerCase() ||
      transaction.from.toLowerCase() !== organizer
    ) return NextResponse.json({ error: "Event transaction does not match this organizer" }, { status: 403 });

    const metadataHash = computeEventMetadataHash({ venueName, eventDescription, venueCidr, posterImageUrl });
    const decoded = decodeFunctionData({ abi: V2_EVENT_ABI, data: transaction.input });
    if (decoded.functionName !== "createEvent") {
      return NextResponse.json({ error: "Unexpected event transaction" }, { status: 403 });
    }
    const [txEventId, txMetadataHash, txVenueCommitment, txStart, txEnd, txFactors] = decoded.args;
    if (
      txEventId.toLowerCase() !== eventId || txMetadataHash.toLowerCase() !== metadataHash ||
      txVenueCommitment.toLowerCase() !== venueCommitment || Number(txStart) !== body.startTime ||
      Number(txEnd) !== body.endTime || Number(txFactors) !== body.requiredFactorBitmap
    ) return NextResponse.json({ error: "Event transaction arguments do not match metadata" }, { status: 403 });

    let policyHash: Hex | null = null;
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== contract.toLowerCase()) continue;
      try {
        const decodedLog = decodeEventLog({ abi: V2_EVENT_ABI, data: log.data, topics: log.topics });
        if (decodedLog.eventName === "EventCreated" && decodedLog.args.eventId === eventId) {
          policyHash = decodedLog.args.policyHash;
          break;
        }
      } catch {
        // Ignore unrelated contract logs.
      }
    }
    if (!policyHash) return NextResponse.json({ error: "EventCreated receipt is missing" }, { status: 403 });

    const { error } = await getEventsSupabaseAdmin().from("events").upsert({
      organizer,
      event_id: eventId,
      venue_hash: venueCommitment,
      subnet_prefix: venueCidr,
      venue_cidrs: [venueCidr],
      start_time: body.startTime,
      end_time: body.endTime,
      venue_name: venueName,
      event_description: eventDescription || null,
      venue_lat: body.venueLat,
      venue_lon: body.venueLon,
      radius_meters: body.radiusMeters,
      poster_image_url: posterImageUrl || null,
      required_factor_bitmap: body.requiredFactorBitmap,
      policy_hash: policyHash,
    }, { onConflict: "event_id" });
    if (error) return NextResponse.json({ error: "Event metadata could not be saved" }, { status: 500 });
    return NextResponse.json({ ok: true, policyHash });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Event could not be saved" }, { status: 400 });
  }
}
