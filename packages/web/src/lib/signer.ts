import { type Hex, keccak256, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { signTypedDataWithLit, type TypedDataPayload } from "@/lib/lit-signer";

type SignerMode = "key" | "lit";

type BaseTypedDataInput = {
  chainId: number;
  verifyingContract: `0x${string}`;
};

type SignIPVerificationInput = BaseTypedDataInput & {
  wallet: `0x${string}`;
  eventId: `0x${string}`;
  venueHash: `0x${string}`;
  deadline: number;
};

type SignEventAuthorizationInput = BaseTypedDataInput & {
  organizer: `0x${string}`;
  eventId: `0x${string}`;
  venueHash: `0x${string}`;
  startTime: number;
  endTime: number;
  venueName: string;
  deadline: number;
};

function getSignerMode(): SignerMode {
  return process.env.SIGNER_MODE?.trim().toLowerCase() === "lit" ? "lit" : "key";
}

function loadPrivateKey(envNames: string[]): `0x${string}` {
  for (const envName of envNames) {
    const value = process.env[envName]?.trim().toLowerCase();
    if (!value) continue;
    if (!/^0x[0-9a-f]{64}$/.test(value)) {
      throw new Error(`Invalid ${envName}`);
    }
    return value as `0x${string}`;
  }

  throw new Error(`Missing signer key (${envNames.join(" or ")})`);
}

async function signTypedDataWithKey(params: {
  typedData: TypedDataPayload;
  keyEnvNames: string[];
}): Promise<Hex> {
  const privateKey = loadPrivateKey(params.keyEnvNames);
  const account = privateKeyToAccount(privateKey);
  const signature = await account.signTypedData(params.typedData as never);
  return signature as Hex;
}

async function signTypedData(params: {
  typedData: TypedDataPayload;
  chainId: number;
  keyEnvNames: string[];
}): Promise<Hex> {
  if (getSignerMode() === "lit") {
    return signTypedDataWithLit({
      typedData: params.typedData,
      chainId: params.chainId,
    });
  }

  return signTypedDataWithKey({
    typedData: params.typedData,
    keyEnvNames: params.keyEnvNames,
  });
}

export async function signIPVerification(input: SignIPVerificationInput): Promise<Hex> {
  return signTypedData({
    chainId: input.chainId,
    keyEnvNames: ["IP_SIGNER_PRIVATE_KEY"],
    typedData: {
      domain: {
        name: "WiFiProof",
        version: "2",
        chainId: input.chainId,
        verifyingContract: input.verifyingContract,
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
        wallet: input.wallet,
        eventId: input.eventId,
        venueHash: input.venueHash,
        deadline: BigInt(input.deadline),
      },
    } as TypedDataPayload,
  });
}

export async function signEventAuthorization(
  input: SignEventAuthorizationInput
): Promise<Hex> {
  return signTypedData({
    chainId: input.chainId,
    keyEnvNames: ["EVENT_SIGNER_PRIVATE_KEY", "IP_SIGNER_PRIVATE_KEY"],
    typedData: {
      domain: {
        name: "WiFiProof",
        version: "2",
        chainId: input.chainId,
        verifyingContract: input.verifyingContract,
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
        organizer: input.organizer,
        eventId: input.eventId,
        venueHash: input.venueHash,
        startTime: BigInt(input.startTime),
        endTime: BigInt(input.endTime),
        venueNameHash: keccak256(toBytes(input.venueName)),
        deadline: BigInt(input.deadline),
      },
    } as TypedDataPayload,
  });
}
