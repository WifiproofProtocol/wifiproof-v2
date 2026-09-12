import { NextResponse } from "next/server";
import {
  getAddress,
  hashTypedData,
  keccak256,
  recoverAddress,
  toBytes,
} from "viem";

import type { TypedDataPayload } from "@/lib/lit-signer";
import { signAttendanceAuthorization } from "@/lib/signer";

function isEnabled() {
  return process.env.NODE_ENV === "development" || process.env.ENABLE_DEV_TEST_PAGES === "true";
}

function getChainId() {
  return Number(process.env.CHAIN_ID?.trim() || "84532");
}

function getExpectedSignerAddress(): `0x${string}` {
  const mode = process.env.SIGNER_MODE?.trim().toLowerCase();
  const value =
    mode === "cdp"
      ? process.env.CDP_AUTHORIZER_ADDRESS?.trim()
      : process.env.LIT_PKP_SIGNER_ADDRESS?.trim();

  if (!value) {
    throw new Error(
      mode === "cdp" ? "Missing CDP_AUTHORIZER_ADDRESS" : "Missing LIT_PKP_SIGNER_ADDRESS",
    );
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
    const signature = await signAttendanceAuthorization({
      chainId: getChainId(),
      verifyingContract: getV2Address(),
      eventId: typedData.message.eventId as `0x${string}`,
      attendanceNullifier: typedData.message.attendanceNullifier as `0x${string}`,
      factorBitmap: Number(typedData.message.factorBitmap),
      evidenceCommitment: typedData.message.evidenceCommitment as `0x${string}`,
      publicInputsHash: typedData.message.publicInputsHash as `0x${string}`,
      policyHash: typedData.message.policyHash as `0x${string}`,
      deadline: Number(typedData.message.deadline),
    });
    const recovered = await recoverTypedDataSigner(typedData, signature);

    const expectedSigner = getExpectedSignerAddress();
    const signerMode = process.env.SIGNER_MODE?.trim().toLowerCase() || "key";

    return NextResponse.json({
      ok: true,
      signerMode,
      expectedSigner,
      litNetwork:
        signerMode === "lit"
          ? process.env.LIT_NETWORK?.trim().toLowerCase() || "chipotle"
          : undefined,
      actionCid:
        signerMode === "lit"
          ? process.env.LIT_ACTION_IPFS_CID?.trim() || "not configured"
          : undefined,
      attendanceAuthorization: {
        recovered,
        matchesExpected: recovered === expectedSigner,
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
