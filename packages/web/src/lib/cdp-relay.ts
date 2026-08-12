import "server-only";

import { CdpClient } from "@coinbase/cdp-sdk";
import { createPublicClient, decodeEventLog, encodeFunctionData, http, type Hex } from "viem";
import { base, baseSepolia } from "viem/chains";

const CLAIM_ABI = [
  {
    type: "function",
    name: "claimAttendanceFor",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "authorization",
        type: "tuple",
        components: [
          { name: "eventId", type: "bytes32" },
          { name: "attendanceNullifier", type: "bytes32" },
          { name: "factorBitmap", type: "uint32" },
          { name: "evidenceCommitment", type: "bytes32" },
          { name: "publicInputsHash", type: "bytes32" },
          { name: "policyHash", type: "bytes32" },
          { name: "deadline", type: "uint64" },
        ],
      },
      { name: "signature", type: "bytes" },
      { name: "proof", type: "bytes" },
      { name: "publicInputs", type: "bytes32[]" },
    ],
    outputs: [{ name: "attestationUid", type: "bytes32" }],
  },
  {
    type: "event",
    name: "AttendanceClaimed",
    inputs: [
      { indexed: true, name: "eventId", type: "bytes32" },
      { indexed: true, name: "attendanceNullifier", type: "bytes32" },
      { indexed: true, name: "attestationUid", type: "bytes32" },
      { indexed: false, name: "evidenceCommitment", type: "bytes32" },
      { indexed: false, name: "factorBitmap", type: "uint32" },
      { indexed: false, name: "verifiedAt", type: "uint64" },
    ],
  },
] as const;

export type RelayAuthorization = {
  eventId: `0x${string}`;
  attendanceNullifier: `0x${string}`;
  factorBitmap: number;
  evidenceCommitment: `0x${string}`;
  publicInputsHash: `0x${string}`;
  policyHash: `0x${string}`;
  deadline: number;
  signature: Hex;
};

export async function relayAttendanceClaim(input: {
  idempotencyKey: string;
  authorization: RelayAuthorization;
  proof: Hex;
  publicInputs: `0x${string}`[];
}) {
  const contractAddress = process.env.WIFIPROOF_V2_ADDRESS?.trim() as `0x${string}` | undefined;
  if (!contractAddress) throw new Error("Missing WIFIPROOF_V2_ADDRESS");

  const chainId = Number(process.env.CHAIN_ID ?? 84532);
  if (chainId !== base.id && chainId !== baseSepolia.id) throw new Error("CDP relay supports only Base networks");
  const network = chainId === base.id ? "base" : "base-sepolia";
  const chain = chainId === base.id ? base : baseSepolia;

  const cdp = new CdpClient();
  const owner = await cdp.evm.getOrCreateAccount({
    name: process.env.CDP_RELAY_OWNER_NAME?.trim() || "wifiproof-relay-owner",
  });
  const smartAccount = await cdp.evm.getOrCreateSmartAccount({
    name: process.env.CDP_RELAY_ACCOUNT_NAME?.trim() || "wifiproof-attendance-relay",
    owner,
  });
  if (process.env.CDP_REQUIRE_ACCOUNT_POLICY !== "false" && !smartAccount.policies?.length) {
    throw new Error("CDP relay account has no restrictive account policy");
  }

  const account = await smartAccount.useNetwork(network);
  const data = encodeFunctionData({
    abi: CLAIM_ABI,
    functionName: "claimAttendanceFor",
    args: [
      {
        eventId: input.authorization.eventId,
        attendanceNullifier: input.authorization.attendanceNullifier,
        factorBitmap: input.authorization.factorBitmap,
        evidenceCommitment: input.authorization.evidenceCommitment,
        publicInputsHash: input.authorization.publicInputsHash,
        policyHash: input.authorization.policyHash,
        deadline: BigInt(input.authorization.deadline),
      },
      input.authorization.signature,
      input.proof,
      input.publicInputs,
    ],
  });
  const operation = await account.sendUserOperation({
    calls: [{ to: contractAddress, value: 0n, data }],
    idempotencyKey: input.idempotencyKey,
  });
  const completed = await account.waitForUserOperation({
    userOpHash: operation.userOpHash,
    waitOptions: { timeoutSeconds: 60 },
  });
  if (completed.status !== "complete") throw new Error("CDP user operation failed");

  const rpcUrl = process.env.BASE_RPC_URL?.trim();
  if (!rpcUrl) throw new Error("Missing BASE_RPC_URL");
  const receipt = await createPublicClient({ chain, transport: http(rpcUrl) }).waitForTransactionReceipt({
    hash: completed.transactionHash as Hex,
  });
  let attestationUid: Hex | null = null;
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({ abi: CLAIM_ABI, data: log.data, topics: log.topics });
      if (decoded.eventName === "AttendanceClaimed") {
        attestationUid = decoded.args.attestationUid;
        break;
      }
    } catch {
      // Ignore unrelated logs in the same transaction.
    }
  }
  if (!attestationUid) throw new Error("Attendance receipt was not emitted");
  return { transactionHash: completed.transactionHash as Hex, attestationUid };
}
