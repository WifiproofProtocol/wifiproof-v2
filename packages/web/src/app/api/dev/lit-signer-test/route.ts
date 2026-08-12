import { NextResponse } from "next/server";
import {
  getAddress,
  hashTypedData,
  keccak256,
  recoverAddress,
  toBytes,
} from "viem";

import { signTypedDataWithLit, type TypedDataPayload } from "@/lib/lit-signer";

function isEnabled() {
  return process.env.NODE_ENV === "development" || process.env.ENABLE_DEV_TEST_PAGES === "true";
}

function getChainId() {
  return Number(process.env.CHAIN_ID?.trim() || "84532");
}

function getLitExpectedSignerAddress(): `0x${string}` {
  const value = process.env.LIT_PKP_SIGNER_ADDRESS?.trim();

  if (!value) {
    throw new Error("Missing LIT_PKP_SIGNER_ADDRESS");
  }

  return getAddress(value) as `0x${string}`;
}

function getV2Address(): `0x${string}` {
  const value = process.env.WIFIPROOF_V2_ADDRESS?.trim();
  if (!value) throw new Error("Missing WIFIPROOF_V2_ADDRESS");
  return getAddress(value) as `0x${string}`;
}

function buildAttendanceAuthorizationTypedData(): TypedDataPayload {
  const chainId = getChainId();
  const verifyingContract = getV2Address();
  const deadline = Math.floor(Date.now() / 1000) + 10 * 60;

  return {
    domain: {
      name: "WiFiProof",
      version: "2",
      chainId,
      verifyingContract,
    },
    types: {
      AttendanceAuthorization: [
        { name: "eventId", type: "bytes32" },
        { name: "attendanceNullifier", type: "bytes32" },
        { name: "factorBitmap", type: "uint32" },
        { name: "evidenceCommitment", type: "bytes32" },
        { name: "publicInputsHash", type: "bytes32" },
        { name: "policyHash", type: "bytes32" },
        { name: "deadline", type: "uint64" },
      ],
    },
    primaryType: "AttendanceAuthorization",
    message: {
      eventId: keccak256(toBytes("dev-lit-signer-test:event")),
      attendanceNullifier: keccak256(toBytes("dev-lit-signer-test:nullifier")),
      factorBitmap: 15,
      evidenceCommitment: keccak256(toBytes("dev-lit-signer-test:evidence")),
      publicInputsHash: keccak256(toBytes("dev-lit-signer-test:public-inputs")),
      policyHash: keccak256(toBytes("dev-lit-signer-test:policy")),
      deadline: BigInt(deadline),
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

export async function GET() {
  if (!isEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const typedData = buildAttendanceAuthorizationTypedData();
    const signature = await signTypedDataWithLit({
      typedData,
      chainId: getChainId(),
    });
    const recovered = await recoverTypedDataSigner(typedData, signature);

    const expectedLitSigner = getLitExpectedSignerAddress();

    return NextResponse.json({
      ok: true,
      currentSignerMode: process.env.SIGNER_MODE?.trim().toLowerCase() || "key",
      litNetwork: process.env.LIT_NETWORK?.trim().toLowerCase() || "chipotle",
      expectedLitSigner,
      actionCid: process.env.LIT_ACTION_IPFS_CID?.trim() || "not configured",
      attendanceAuthorization: {
        recovered,
        matchesExpected: recovered === expectedLitSigner,
        signature,
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
