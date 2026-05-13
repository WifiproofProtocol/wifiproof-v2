import { NextResponse } from "next/server";
import { createPublicClient, http, zeroHash } from "viem";
import { base, baseSepolia } from "viem/chains";

import { issueHumanityToken } from "@/lib/humanity";
import { requireAddress, requireBytes32 } from "@/lib/world";

type CoinbaseVerifyRequest = {
  wallet: `0x${string}`;
  eventId: `0x${string}`;
};

type CoinbaseVerificationConfig = {
  label: string;
  rpcUrl: string;
  chain: typeof base | typeof baseSepolia;
  easAddress: `0x${string}`;
  indexerAddress: `0x${string}`;
  schemaUid: `0x${string}`;
  attester: `0x${string}`;
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

const COINBASE_BASE_MAINNET = {
  easAddress: "0x4200000000000000000000000000000000000021",
  indexerAddress: "0x2c7eE1E5f416dfF40054c27A62f7B357C4E8619C",
  schemaUid: "0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9",
  attester: "0x357458739F90461b99789350868CD7CF330Dd7EE",
} as const;

function getBaseMainnetRpcUrl() {
  return (
    process.env.COINBASE_VERIFICATION_BASE_RPC_URL?.trim() ??
    process.env.BASE_MAINNET_RPC_URL?.trim() ??
    process.env.NEXT_PUBLIC_BASE_MAINNET_RPC_URL?.trim() ??
    "https://mainnet.base.org"
  );
}

function getConfiguredRpcUrl() {
  return (
    process.env.BASE_RPC_URL?.trim() ??
    process.env.NEXT_PUBLIC_BASE_RPC_URL?.trim() ??
    "https://sepolia.base.org"
  );
}

async function getContractConfiguredCoinbaseVerification(): Promise<CoinbaseVerificationConfig | null> {
  const verifyingContract = (
    process.env.WIFIPROOF_ADDRESS?.trim() ??
    process.env.NEXT_PUBLIC_WIFIPROOF_ADDRESS?.trim()
  ) as `0x${string}` | undefined;

  if (!verifyingContract) {
    return null;
  }

  const chain = getChain();
  const publicClient = createPublicClient({
    chain,
    transport: http(getConfiguredRpcUrl()),
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

  return {
    label: chain.id === base.id ? "Base mainnet contract config" : "Base Sepolia contract config",
    rpcUrl: getConfiguredRpcUrl(),
    chain,
    easAddress,
    indexerAddress,
    schemaUid,
    attester,
  };
}

async function verifyCoinbaseAttestation(
  config: CoinbaseVerificationConfig,
  wallet: `0x${string}`
) {
  const publicClient = createPublicClient({
    chain: config.chain,
    transport: http(config.rpcUrl),
  });

  const attestationUid = await publicClient.readContract({
    address: config.indexerAddress,
    abi: INDEXER_ABI,
    functionName: "getAttestationUid",
    args: [wallet, config.schemaUid],
  });

  if (attestationUid === zeroHash) {
    return { ok: false as const, reason: "missing", label: config.label };
  }

  const attestation = await publicClient.readContract({
    address: config.easAddress,
    abi: EAS_ABI,
    functionName: "getAttestation",
    args: [attestationUid],
  });

  const now = BigInt(Math.floor(Date.now() / 1000));
  const isValid =
    attestation.recipient.toLowerCase() === wallet &&
    attestation.attester.toLowerCase() === config.attester.toLowerCase() &&
    attestation.schema.toLowerCase() === config.schemaUid.toLowerCase() &&
    attestation.revocationTime === 0n &&
    (attestation.expirationTime === 0n || attestation.expirationTime > now);

  if (!isValid) {
    return { ok: false as const, reason: "invalid", label: config.label };
  }

  return { ok: true as const, label: config.label, attestationUid };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CoinbaseVerifyRequest;
    const wallet = requireAddress(body.wallet);
    const eventId = requireBytes32(body.eventId);

    const configs: CoinbaseVerificationConfig[] = [
      {
        label: "Base mainnet",
        rpcUrl: getBaseMainnetRpcUrl(),
        chain: base,
        ...COINBASE_BASE_MAINNET,
      },
    ];

    const contractConfigured = await getContractConfiguredCoinbaseVerification();
    if (
      contractConfigured &&
      contractConfigured.schemaUid.toLowerCase() !==
        COINBASE_BASE_MAINNET.schemaUid.toLowerCase()
    ) {
      configs.push(contractConfigured);
    }

    const attempts = await Promise.allSettled(
      configs.map((config) => verifyCoinbaseAttestation(config, wallet))
    );
    const success = attempts.find(
      (attempt): attempt is PromiseFulfilledResult<Awaited<ReturnType<typeof verifyCoinbaseAttestation>>> =>
        attempt.status === "fulfilled" && attempt.value.ok
    );

    if (!success) {
      const checked = configs.map((config) => config.label).join(" and ");
      return NextResponse.json(
        {
          error:
            `No Coinbase Verified attestation was found for this wallet. Checked ${checked}. Make sure the connected wallet is the same address that received the Coinbase Verified Account attestation.`,
        },
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
      network: success.value.label,
      attestationUid: success.value.attestationUid,
      expiresAt: claims.exp,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
