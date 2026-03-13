import {
  createPublicClient,
  decodeEventLog,
  decodeFunctionData,
  encodeAbiParameters,
  http,
  keccak256,
} from "viem";
import type { Hex } from "viem";
import { baseSepolia } from "viem/chains";

const WIFI_PROOF_ABI = [
  {
    type: "function",
    name: "computeVenueHashFromScaled",
    stateMutability: "pure",
    inputs: [
      { name: "venueLatScaled", type: "int256" },
      { name: "venueLonScaled", type: "int256" },
      { name: "thresholdSqScaled", type: "uint256" },
      { name: "eventId", type: "bytes32" },
    ],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "function",
    name: "createEventWithSig",
    stateMutability: "nonpayable",
    inputs: [
      { name: "organizer", type: "address" },
      { name: "eventId", type: "bytes32" },
      { name: "venueHash", type: "bytes32" },
      { name: "startTime", type: "uint64" },
      { name: "endTime", type: "uint64" },
      { name: "venueName", type: "string" },
      { name: "deadline", type: "uint64" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "claimAttendance",
    stateMutability: "payable",
    inputs: [
      { name: "proof", type: "bytes" },
      { name: "publicInputs", type: "bytes32[]" },
      { name: "ipSignature", type: "bytes" },
      { name: "sigDeadline", type: "uint64" },
      { name: "eventId", type: "bytes32" },
    ],
    outputs: [{ name: "attestationUid", type: "bytes32" }],
  },
  {
    type: "event",
    name: "EventCreated",
    inputs: [
      { indexed: true, name: "eventId", type: "bytes32" },
      { indexed: false, name: "venueHash", type: "bytes32" },
      { indexed: false, name: "startTime", type: "uint64" },
      { indexed: false, name: "endTime", type: "uint64" },
      { indexed: false, name: "venueName", type: "string" },
    ],
  },
  {
    type: "event",
    name: "AttendanceClaimed",
    inputs: [
      { indexed: true, name: "attendee", type: "address" },
      { indexed: true, name: "eventId", type: "bytes32" },
      { indexed: false, name: "attestationUid", type: "bytes32" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
  },
] as const;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function requireRpcUrl(): string {
  const rpcUrl =
    process.env.BASE_RPC_URL?.trim() ?? process.env.NEXT_PUBLIC_BASE_RPC_URL?.trim();

  if (!rpcUrl) {
    throw new Error("Missing BASE_RPC_URL");
  }

  return rpcUrl;
}

export function getWiFiProofAddress(): `0x${string}` {
  const address =
    process.env.WIFIPROOF_ADDRESS?.trim() ??
    process.env.NEXT_PUBLIC_WIFIPROOF_ADDRESS?.trim();

  if (!address) {
    throw new Error("Missing WIFIPROOF_ADDRESS");
  }

  return address as `0x${string}`;
}

function getPublicClient() {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(requireRpcUrl()),
  });
}

function toScaled(coord: number) {
  return Math.round(coord * 1_000_000);
}

function thresholdSqScaled(radiusMeters: number) {
  const radiusScaled = Math.floor((radiusMeters * 1_000_000) / 111_320);
  return BigInt(radiusScaled) * BigInt(radiusScaled);
}

export async function computeVenueHashFromMetadata(input: {
  eventId: `0x${string}`;
  venueLat: number;
  venueLon: number;
  radiusMeters: number;
}): Promise<`0x${string}`> {
  const publicClient = getPublicClient();
  const address = getWiFiProofAddress();

  return publicClient.readContract({
    address,
    abi: WIFI_PROOF_ABI,
    functionName: "computeVenueHashFromScaled",
    args: [
      BigInt(toScaled(input.venueLat)),
      BigInt(toScaled(input.venueLon)),
      thresholdSqScaled(input.radiusMeters),
      input.eventId,
    ],
  });
}

export async function verifyEventCreationTransaction(input: {
  txHash: `0x${string}`;
  organizer: `0x${string}`;
  eventId: `0x${string}`;
  venueHash: `0x${string}`;
  startTime: number;
  endTime: number;
  venueName: string;
}): Promise<void> {
  const publicClient = getPublicClient();
  const address = normalize(getWiFiProofAddress());
  const [tx, receipt] = await Promise.all([
    publicClient.getTransaction({ hash: input.txHash }),
    publicClient.getTransactionReceipt({ hash: input.txHash }),
  ]);

  if (receipt.status !== "success") {
    throw new Error("Event creation transaction did not succeed");
  }

  if (!tx.to || normalize(tx.to) !== address) {
    throw new Error("Event creation transaction targeted the wrong contract");
  }

  if (normalize(tx.from) !== normalize(input.organizer)) {
    throw new Error("Event creation transaction sender mismatch");
  }

  const decoded = decodeFunctionData({
    abi: WIFI_PROOF_ABI,
    data: tx.input,
  });

  if (decoded.functionName !== "createEventWithSig") {
    throw new Error("Unexpected event creation function");
  }

  const [organizerArg, eventIdArg, venueHashArg, startArg, endArg, venueNameArg] =
    decoded.args;

  if (
    normalize(String(organizerArg)) !== normalize(input.organizer) ||
    normalize(String(eventIdArg)) !== normalize(input.eventId) ||
    normalize(String(venueHashArg)) !== normalize(input.venueHash) ||
    Number(startArg) !== input.startTime ||
    Number(endArg) !== input.endTime ||
    String(venueNameArg) !== input.venueName
  ) {
    throw new Error("Event creation transaction arguments mismatch");
  }

  const eventLog = receipt.logs.find((log) => {
    if (normalize(log.address) !== address) {
      return false;
    }

    try {
      const decodedLog = decodeEventLog({
        abi: WIFI_PROOF_ABI,
        data: log.data,
        topics: log.topics,
      });

      if (decodedLog.eventName !== "EventCreated") {
        return false;
      }

      return (
        normalize(String(decodedLog.args.eventId)) === normalize(input.eventId) &&
        normalize(String(decodedLog.args.venueHash)) === normalize(input.venueHash) &&
        Number(decodedLog.args.startTime) === input.startTime &&
        Number(decodedLog.args.endTime) === input.endTime &&
        String(decodedLog.args.venueName) === input.venueName
      );
    } catch {
      return false;
    }
  });

  if (!eventLog) {
    throw new Error("Missing EventCreated log for this transaction");
  }
}

export async function verifyAttendanceClaimTransaction(input: {
  txHash: `0x${string}`;
  wallet: `0x${string}`;
  eventId: `0x${string}`;
  attestationUid: `0x${string}`;
  proofHash: `0x${string}`;
  publicInputsHash: `0x${string}`;
}): Promise<void> {
  const publicClient = getPublicClient();
  const address = normalize(getWiFiProofAddress());
  const [tx, receipt] = await Promise.all([
    publicClient.getTransaction({ hash: input.txHash }),
    publicClient.getTransactionReceipt({ hash: input.txHash }),
  ]);

  if (receipt.status !== "success") {
    throw new Error("Attendance claim transaction did not succeed");
  }

  if (!tx.to || normalize(tx.to) !== address) {
    throw new Error("Attendance claim targeted the wrong contract");
  }

  if (normalize(tx.from) !== normalize(input.wallet)) {
    throw new Error("Attendance claim sender mismatch");
  }

  const decoded = decodeFunctionData({
    abi: WIFI_PROOF_ABI,
    data: tx.input,
  });

  if (decoded.functionName !== "claimAttendance") {
    throw new Error("Unexpected attendance claim function");
  }

  const [proof, publicInputs, , , eventIdArg] = decoded.args;
  const computedProofHash = keccak256(proof as Hex);
  const computedPublicInputsHash = keccak256(
    encodeAbiParameters([{ type: "bytes32[]" }], [publicInputs as readonly `0x${string}`[]])
  );

  if (
    normalize(String(eventIdArg)) !== normalize(input.eventId) ||
    normalize(computedProofHash) !== normalize(input.proofHash) ||
    normalize(computedPublicInputsHash) !== normalize(input.publicInputsHash)
  ) {
    throw new Error("Attendance claim arguments mismatch");
  }

  const claimLog = receipt.logs.find((log) => {
    if (normalize(log.address) !== address) {
      return false;
    }

    try {
      const decodedLog = decodeEventLog({
        abi: WIFI_PROOF_ABI,
        data: log.data,
        topics: log.topics,
      });

      if (decodedLog.eventName !== "AttendanceClaimed") {
        return false;
      }

      return (
        normalize(String(decodedLog.args.attendee)) === normalize(input.wallet) &&
        normalize(String(decodedLog.args.eventId)) === normalize(input.eventId) &&
        normalize(String(decodedLog.args.attestationUid)) ===
          normalize(input.attestationUid)
      );
    } catch {
      return false;
    }
  });

  if (!claimLog) {
    throw new Error("Missing AttendanceClaimed log for this transaction");
  }
}
