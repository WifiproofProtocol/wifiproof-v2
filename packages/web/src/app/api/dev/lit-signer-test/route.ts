import { NextResponse } from "next/server";
import {
  createPublicClient,
  getAddress,
  hashTypedData,
  http,
  keccak256,
  recoverAddress,
  toBytes,
} from "viem";
import { baseSepolia } from "viem/chains";

import { signTypedDataWithLit, type TypedDataPayload } from "@/lib/lit-signer";
import { getWiFiProofAddress } from "@/lib/wifiproof-chain";

const WIFI_PROOF_READ_ABI = [
  {
    type: "function",
    name: "ipSigner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

function isEnabled() {
  return process.env.NODE_ENV === "development" || process.env.ENABLE_DEV_TEST_PAGES === "true";
}

function getChainId() {
  return Number(process.env.CHAIN_ID?.trim() || "84532");
}

function getRpcUrl() {
  const rpcUrl =
    process.env.BASE_RPC_URL?.trim() ?? process.env.NEXT_PUBLIC_BASE_RPC_URL?.trim();

  if (!rpcUrl) {
    throw new Error("Missing BASE_RPC_URL");
  }

  return rpcUrl;
}

function getLitExpectedSignerAddress(): `0x${string}` {
  const value =
    process.env.LIT_CHIPOTLE_PKP_ADDRESS?.trim() ??
    process.env.LIT_PKP_SIGNER_ADDRESS?.trim();

  if (!value) {
    throw new Error("Missing LIT_CHIPOTLE_PKP_ADDRESS or LIT_PKP_SIGNER_ADDRESS");
  }

  return getAddress(value) as `0x${string}`;
}

function buildIpVerificationTypedData(): TypedDataPayload {
  const chainId = getChainId();
  const verifyingContract = getWiFiProofAddress();
  const deadline = Math.floor(Date.now() / 1000) + 10 * 60;

  return {
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
      wallet: "0x1111111111111111111111111111111111111111",
      eventId: keccak256(toBytes("dev-lit-signer-test:event")),
      venueHash: keccak256(toBytes("dev-lit-signer-test:venue")),
      deadline: BigInt(deadline),
    },
  } as TypedDataPayload;
}

function buildEventAuthorizationTypedData(): TypedDataPayload {
  const chainId = getChainId();
  const verifyingContract = getWiFiProofAddress();
  const now = Math.floor(Date.now() / 1000);

  return {
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
      organizer: "0x2222222222222222222222222222222222222222",
      eventId: keccak256(toBytes("dev-lit-signer-test:event-authorization")),
      venueHash: keccak256(toBytes("dev-lit-signer-test:venue-authorization")),
      startTime: BigInt(now + 600),
      endTime: BigInt(now + 3600),
      venueNameHash: keccak256(toBytes("WiFiProof Lit Signer Test")),
      deadline: BigInt(now + 1200),
    },
  } as TypedDataPayload;
}

async function recoverTypedDataSigner(
  typedData: TypedDataPayload,
  signature: `0x${string}`
): Promise<`0x${string}`> {
  const digest = hashTypedData(typedData as never);
  return getAddress(await recoverAddress({ hash: digest, signature })) as `0x${string}`;
}

async function getContractIpSigner(): Promise<`0x${string}`> {
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(getRpcUrl()),
  });

  return publicClient.readContract({
    address: getWiFiProofAddress(),
    abi: WIFI_PROOF_READ_ABI,
    functionName: "ipSigner",
  });
}

export async function GET() {
  if (!isEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const ipTypedData = buildIpVerificationTypedData();
    const eventTypedData = buildEventAuthorizationTypedData();

    const [contractIpSigner, ipSignature, eventSignature] = await Promise.all([
      getContractIpSigner(),
      signTypedDataWithLit({
        typedData: ipTypedData,
        chainId: getChainId(),
      }),
      signTypedDataWithLit({
        typedData: eventTypedData,
        chainId: getChainId(),
      }),
    ]);

    const [ipRecovered, eventRecovered] = await Promise.all([
      recoverTypedDataSigner(ipTypedData, ipSignature),
      recoverTypedDataSigner(eventTypedData, eventSignature),
    ]);

    const expectedLitSigner = getLitExpectedSignerAddress();

    return NextResponse.json({
      ok: true,
      currentSignerMode: process.env.SIGNER_MODE?.trim().toLowerCase() || "key",
      litNetwork: process.env.LIT_NETWORK?.trim().toLowerCase() || "naga-test",
      expectedLitSigner,
      contractIpSigner,
      contractMatchesLitSigner: contractIpSigner === expectedLitSigner,
      ipVerification: {
        recovered: ipRecovered,
        matchesExpected: ipRecovered === expectedLitSigner,
        signature: ipSignature,
      },
      eventAuthorization: {
        recovered: eventRecovered,
        matchesExpected: eventRecovered === expectedLitSigner,
        signature: eventSignature,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
