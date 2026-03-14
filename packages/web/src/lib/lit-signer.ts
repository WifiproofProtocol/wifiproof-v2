import { createAuthManager, storagePlugins } from "@lit-protocol/auth";
import { LIT_ABILITY } from "@lit-protocol/constants";
import { createLitClient } from "@lit-protocol/lit-client";
import {
  naga,
  nagaDev,
  nagaLocal,
  nagaMainnet,
  nagaProto,
  nagaStaging,
  nagaTest,
} from "@lit-protocol/networks";
import { getAddress, type Hex, hashTypedData, keccak256, recoverAddress, toBytes } from "viem";
import { privateKeyToAccount, publicKeyToAddress } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";

const CHIPOTLE_DEFAULT_BASE_URL = "https://api.dev.litprotocol.com/core/v1";

// Lit Action: uses Lit.Actions.getPrivateKey({ pkpId }) to get the PKP private key,
// then signs the pre-hashed EIP-712 digest using ethers.Wallet.
// pkpId = wallet address (from js_params), digestHex = 32-byte hex EIP-712 hash.
const CHIPOTLE_ACTION_CODE = String.raw`
(async () => {
  const payload = typeof jsParams !== "undefined" ? jsParams : {};
  const pkpId =
    (typeof pkpAddress !== "undefined" ? pkpAddress : undefined) ||
    payload.pkpAddress;
  const digestHexStr =
    (typeof digestHex !== "undefined" ? digestHex : undefined) ||
    payload.digestHex;

  if (!pkpId || typeof pkpId !== "string") {
    Lit.Actions.setResponse({ response: JSON.stringify({ error: "Missing pkpAddress" }) });
    return;
  }
  if (!digestHexStr || typeof digestHexStr !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(digestHexStr)) {
    Lit.Actions.setResponse({ response: JSON.stringify({ error: "Invalid digestHex: " + String(digestHexStr) }) });
    return;
  }

  const privateKey = await Lit.Actions.getPrivateKey({ pkpId });
  const wallet = new ethers.Wallet(privateKey);

  // Sign the raw digest directly (no additional hashing — digest is already EIP-712 hash)
  const signingKey = new ethers.utils.SigningKey(privateKey);
  const sig = signingKey.signDigest(digestHexStr);
  const signature = ethers.utils.joinSignature(sig);

  Lit.Actions.setResponse({ response: signature });
})();
`;

type ChipotleActionResponse = {
  has_error?: boolean;
  logs?: string;
  response?: string;
  signatures?: unknown[];
};

function requireEnvChipotle(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function getChipotleBaseUrl(): string {
  return (
    process.env.LIT_CHIPOTLE_API_BASE_URL?.trim().replace(/\/+$/, "") ||
    CHIPOTLE_DEFAULT_BASE_URL
  );
}



function getChipotlePkpAddress(): string {
  const value =
    process.env.LIT_CHIPOTLE_PKP_ADDRESS?.trim() ||
    process.env.LIT_PKP_SIGNER_ADDRESS?.trim();
  if (!value) throw new Error("Missing LIT_CHIPOTLE_PKP_ADDRESS or LIT_PKP_SIGNER_ADDRESS");
  return value;
}

async function signTypedDataWithChipotle(params: {
  typedData: TypedDataPayload;
}): Promise<Hex> {
  const apiKey = requireEnvChipotle("LIT_CHIPOTLE_API_KEY");
  const pkpAddress = getAddress(getChipotlePkpAddress());
  const baseUrl = getChipotleBaseUrl();
  const digest = hashTypedData(params.typedData as never);

  const response = await fetch(`${baseUrl}/lit_action`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      code: CHIPOTLE_ACTION_CODE,
      js_params: { pkpAddress, digestHex: digest },
    }),
  });

  const rawBody = await response.text();
  if (!response.ok) {
    throw new Error(`Chipotle request failed (${response.status}): ${rawBody.slice(0, 400)}`);
  }

  let payload: ChipotleActionResponse;
  try {
    payload = JSON.parse(rawBody) as ChipotleActionResponse;
  } catch {
    throw new Error(`Invalid Chipotle response JSON: ${rawBody.slice(0, 300)}`);
  }

  if (payload.has_error) {
    const details = [payload.response, payload.logs].filter(Boolean).join(" | ");
    throw new Error(`Chipotle action error${details ? `: ${details}` : ""}`);
  }

  // The action returns the full 65-byte signature string via setResponse
  const sig = payload.response;
  if (!sig || !/^0x[0-9a-fA-F]{130}$/.test(sig)) {
    throw new Error(
      `Chipotle: unexpected signature format in response: ${String(sig).slice(0, 100)}. Raw: ${rawBody.slice(0, 400)}`
    );
  }

  const signature = sig as Hex;
  const recovered = getAddress(await recoverAddress({ hash: digest, signature }));
  if (recovered !== pkpAddress) {
    throw new Error(
      `Chipotle signer mismatch. Recovered ${recovered} but expected ${pkpAddress}`
    );
  }

  return signature;
}

type LocalAccount = ReturnType<typeof privateKeyToAccount>;
export type TypedDataPayload = Parameters<LocalAccount["signTypedData"]>[0];

type LitContext = {
  litClient: Awaited<ReturnType<typeof createLitClient>>;
  authContext: Awaited<
    ReturnType<ReturnType<typeof createAuthManager>["createEoaAuthContext"]>
  >;
  pkpPublicKey: `0x${string}`;
};

let contextPromise: Promise<LitContext> | null = null;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function normalizeHex(value: string, name: string): `0x${string}` {
  const normalized = value.trim().toLowerCase();
  if (!/^0x[0-9a-f]+$/.test(normalized)) {
    throw new Error(`Invalid ${name}`);
  }
  return normalized as `0x${string}`;
}

function resolveLitNetworkName() {
  return (process.env.LIT_NETWORK ?? "naga-test").trim().toLowerCase();
}

function resolveLegacyLitNetwork() {
  const value = resolveLitNetworkName();

  switch (value) {
    case "naga":
      return { module: naga, name: "naga" };
    case "naga-mainnet":
      return { module: nagaMainnet, name: "naga-mainnet" };
    case "naga-test":
      return { module: nagaTest, name: "naga-test" };
    case "naga-dev":
      return { module: nagaDev, name: "naga-dev" };
    case "naga-local":
      return { module: nagaLocal, name: "naga-local" };
    case "naga-staging":
      return { module: nagaStaging, name: "naga-staging" };
    case "naga-proto":
      return { module: nagaProto, name: "naga-proto" };
    default:
      throw new Error(
        "Invalid LIT_NETWORK. Expected one of: chipotle, naga, naga-mainnet, naga-test, naga-dev, naga-local, naga-staging, naga-proto."
      );
  }
}

function pubkeyToTokenId(pubkey: `0x${string}`): string {
  const bytes = toBytes(pubkey);
  if (bytes.length !== 65) {
    throw new Error(`Invalid LIT_PKP_PUBLIC_KEY length: expected 65 bytes, got ${bytes.length}`);
  }
  return BigInt(keccak256(bytes)).toString();
}

function resolveChainConfig(chainId: number) {
  if (chainId === base.id) return base;
  if (chainId === baseSepolia.id) return baseSepolia;
  return baseSepolia;
}

async function buildContext(): Promise<LitContext> {
  const { module: networkModule, name: networkName } = resolveLegacyLitNetwork();
  const litClient = await createLitClient({ network: networkModule });

  const pkpPublicKey = normalizeHex(requireEnv("LIT_PKP_PUBLIC_KEY"), "LIT_PKP_PUBLIC_KEY");
  const authPrivateKey = normalizeHex(
    requireEnv("LIT_EOA_PRIVATE_KEY"),
    "LIT_EOA_PRIVATE_KEY"
  );

  const expectedSigner = process.env.LIT_PKP_SIGNER_ADDRESS?.trim().toLowerCase();
  if (expectedSigner) {
    const derivedSigner = publicKeyToAddress(pkpPublicKey).toLowerCase();
    if (derivedSigner !== expectedSigner) {
      throw new Error(
        `LIT_PKP_SIGNER_ADDRESS mismatch. Derived ${derivedSigner} from LIT_PKP_PUBLIC_KEY`
      );
    }
  }

  const storagePath = process.env.LIT_AUTH_STORAGE_PATH?.trim() || "/tmp/wifiproof-lit-auth";
  const appName = process.env.LIT_APP_NAME?.trim() || "wifiproof";
  const domain = process.env.LIT_AUTH_DOMAIN?.trim() || "wifiproof.xyz";
  const statement =
    process.env.LIT_AUTH_STATEMENT?.trim() || "WiFiProof server signer session";

  const authManager = createAuthManager({
    storage: storagePlugins.localStorageNode({
      appName,
      networkName,
      storagePath,
    }),
  });

  const authContext = await authManager.createEoaAuthContext({
    litClient: litClient as never,
    config: {
      account: privateKeyToAccount(authPrivateKey),
    },
    authConfig: {
      domain,
      statement,
      resources: [[LIT_ABILITY.PKPSigning, pubkeyToTokenId(pkpPublicKey)]],
    },
  } as never);

  return {
    litClient,
    authContext,
    pkpPublicKey,
  };
}

async function getContext(): Promise<LitContext> {
  if (!contextPromise) {
    contextPromise = buildContext().catch((error) => {
      contextPromise = null;
      throw error;
    });
  }
  return contextPromise;
}

export async function signTypedDataWithLit(params: {
  typedData: TypedDataPayload;
  chainId: number;
}): Promise<Hex> {
  if (resolveLitNetworkName() === "chipotle") {
    return signTypedDataWithChipotle({ typedData: params.typedData });
  }

  const context = await getContext();
  const account = await context.litClient.getPkpViemAccount({
    pkpPublicKey: context.pkpPublicKey,
    authContext: context.authContext as never,
    chainConfig: resolveChainConfig(params.chainId),
  });

  return (await account.signTypedData(params.typedData as never)) as Hex;
}
