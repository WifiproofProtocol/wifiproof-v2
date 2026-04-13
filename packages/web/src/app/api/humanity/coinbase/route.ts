import { NextResponse } from "next/server";
import { createPublicClient, http, zeroHash } from "viem";
import { base, baseSepolia } from "viem/chains";

import { issueHumanityToken } from "@/lib/humanity";
import { requireAddress, requireBytes32 } from "@/lib/world";

type CoinbaseVerifyRequest = {
  wallet: `0x${string}`;
  eventId: `0x${string}`;
};

const WIFI_PROOF_CONFIG_ABI = [
  {
    type: "function",
    name: "eas",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "cbIndexer",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "cbVerifiedAccountSchema",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "cbAttester",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
] as const;

const INDEXER_ABI = [
  {
    type: "function",
    name: "getAttestationUid",
    stateMutability: "view",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "schema", type: "bytes32" },
    ],
    outputs: [{ type: "bytes32" }],
  },
] as const;

const EAS_ABI = [
  {
    type: "function",
    name: "getAttestation",
    stateMutability: "view",
    inputs: [{ name: "uid", type: "bytes32" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "uid", type: "bytes32" },
          { name: "schema", type: "bytes32" },
          { name: "time", type: "uint64" },
          { name: "expirationTime", type: "uint64" },
          { name: "revocationTime", type: "uint64" },
          { name: "refUID", type: "bytes32" },
          { name: "recipient", type: "address" },
          { name: "attester", type: "address" },
          { name: "revocable", type: "bool" },
          { name: "data", type: "bytes" },
        ],
      },
    ],
  },
] as const;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getChain() {
  const chainId = Number(process.env.CHAIN_ID?.trim() ?? 84532);
  return chainId === base.id ? base : baseSepolia;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CoinbaseVerifyRequest;
    const wallet = requireAddress(body.wallet);
    const eventId = requireBytes32(body.eventId);

    const rpcUrl =
      process.env.BASE_RPC_URL?.trim() ??
      process.env.NEXT_PUBLIC_BASE_RPC_URL?.trim() ??
      "https://sepolia.base.org";
    const verifyingContract = (
      process.env.WIFIPROOF_ADDRESS?.trim() ??
      process.env.NEXT_PUBLIC_WIFIPROOF_ADDRESS?.trim()
    ) as `0x${string}` | undefined;

    if (!verifyingContract) {
      return NextResponse.json({ error: "Missing WIFIPROOF_ADDRESS" }, { status: 500 });
    }

    const publicClient = createPublicClient({
      chain: getChain(),
      transport: http(rpcUrl),
    });

    const [easAddress, indexerAddress, schemaUid, attester] = await Promise.all([
      publicClient.readContract({
        address: verifyingContract,
        abi: WIFI_PROOF_CONFIG_ABI,
        functionName: "eas",
      }),
      publicClient.readContract({
        address: verifyingContract,
        abi: WIFI_PROOF_CONFIG_ABI,
        functionName: "cbIndexer",
      }),
      publicClient.readContract({
        address: verifyingContract,
        abi: WIFI_PROOF_CONFIG_ABI,
        functionName: "cbVerifiedAccountSchema",
      }),
      publicClient.readContract({
        address: verifyingContract,
        abi: WIFI_PROOF_CONFIG_ABI,
        functionName: "cbAttester",
      }),
    ]);

    const attestationUid = await publicClient.readContract({
      address: indexerAddress,
      abi: INDEXER_ABI,
      functionName: "getAttestationUid",
      args: [wallet, schemaUid],
    });

    if (attestationUid === zeroHash) {
      return NextResponse.json(
        {
          error:
            "No Coinbase Verified attestation was found for this wallet on Base. Try a Coinbase/Base smart wallet, or use World ID instead.",
        },
        { status: 403 }
      );
    }

    const attestation = await publicClient.readContract({
      address: easAddress,
      abi: EAS_ABI,
      functionName: "getAttestation",
      args: [attestationUid],
    });

    const now = BigInt(Math.floor(Date.now() / 1000));
    const isValid =
      attestation.recipient.toLowerCase() === wallet &&
      attestation.attester.toLowerCase() === attester.toLowerCase() &&
      attestation.revocationTime === 0n &&
      (attestation.expirationTime === 0n || attestation.expirationTime > now);

    if (!isValid) {
      return NextResponse.json(
        { error: "Coinbase verification exists, but the attestation is no longer valid." },
        { status: 403 }
      );
    }

    const { token, claims } = issueHumanityToken({
      wallet,
      eventId,
      provider: "coinbase",
    });

    return NextResponse.json({
      ok: true,
      token,
      provider: "coinbase",
      expiresAt: claims.exp,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
