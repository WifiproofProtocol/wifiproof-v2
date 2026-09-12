import { getAddress, type Hex, hashTypedData, recoverAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const CHIPOTLE_DEFAULT_BASE_URL = "https://api.chipotle.litprotocol.com/core/v1";

type LocalAccount = ReturnType<typeof privateKeyToAccount>;
export type TypedDataPayload = Parameters<LocalAccount["signTypedData"]>[0];

type ChipotleActionResponse = {
  has_error?: boolean;
  logs?: string;
  response?: string;
};

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function baseUrl() {
  return process.env.LIT_API_BASE_URL?.trim().replace(/\/+$/, "") || CHIPOTLE_DEFAULT_BASE_URL;
}

function assertChipotle() {
  const network = (process.env.LIT_NETWORK ?? "chipotle").trim().toLowerCase();
  if (network !== "chipotle") {
    throw new Error("WiFiProof V2 supports only the current Lit Chipotle API");
  }
}

function serializableMessage(typedData: TypedDataPayload) {
  const payload = typedData as Record<string, unknown>;
  if (payload.primaryType !== "AttendanceAuthorization") {
    throw new Error("The WiFiProof Lit Action signs AttendanceAuthorization only");
  }
  return JSON.parse(
    JSON.stringify(payload.message, (_, value) =>
      typeof value === "bigint" ? value.toString() : value,
    ),
  ) as Record<string, unknown>;
}

export async function signTypedDataWithLit(params: {
  typedData: TypedDataPayload;
  chainId: number;
}): Promise<Hex> {
  assertChipotle();

  const apiKey = requireEnv("LIT_USAGE_API_KEY");
  const pkpId = requireEnv("LIT_PKP_ID");
  const actionCid = requireEnv("LIT_ACTION_IPFS_CID");
  const expectedSigner = getAddress(requireEnv("LIT_PKP_SIGNER_ADDRESS"));
  const digest = hashTypedData(params.typedData as never);
  const domainChainId = Number((params.typedData as { domain?: { chainId?: number | bigint } }).domain?.chainId);
  if (domainChainId !== params.chainId) throw new Error("Lit typed-data chain mismatch");

  const response = await fetch(`${baseUrl()}/lit_action`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      ipfs_id: actionCid,
      js_params: {
        pkpId,
        authorization: serializableMessage(params.typedData),
      },
    }),
  });

  const rawBody = await response.text();
  if (!response.ok) {
    throw new Error(`Lit request failed (${response.status}): ${rawBody.slice(0, 400)}`);
  }

  let payload: ChipotleActionResponse;
  try {
    payload = JSON.parse(rawBody) as ChipotleActionResponse;
  } catch {
    throw new Error(`Invalid Lit response JSON: ${rawBody.slice(0, 300)}`);
  }
  if (payload.has_error) {
    const details = [payload.response, payload.logs].filter(Boolean).join(" | ");
    throw new Error(`Lit Action failed${details ? `: ${details}` : ""}`);
  }
  if (!payload.response || !/^0x[0-9a-fA-F]{130}$/.test(payload.response)) {
    throw new Error("Lit Action returned an invalid signature");
  }

  const signature = payload.response as Hex;
  const recovered = getAddress(await recoverAddress({ hash: digest, signature }));
  if (recovered !== expectedSigner) {
    throw new Error(`Lit signer mismatch: recovered ${recovered}, expected ${expectedSigner}`);
  }
  return signature;
}
