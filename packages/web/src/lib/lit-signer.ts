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
import { type Hex, keccak256, toBytes } from "viem";
import { privateKeyToAccount, publicKeyToAddress } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";

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

function resolveLitNetwork() {
  const value = (process.env.LIT_NETWORK ?? "naga-test").trim().toLowerCase();

  switch (value) {
    case "chipotle":
      throw new Error(
        "LIT_NETWORK=chipotle is not supported by this signer yet. This repository still uses the Naga-era Lit SDK integration and needs a migration before SIGNER_MODE=lit can be enabled."
      );
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
        "Invalid LIT_NETWORK. Expected one of: naga, naga-mainnet, naga-test, naga-dev, naga-local, naga-staging, naga-proto. Chipotle is not wired into this signer yet."
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
  const { module: networkModule, name: networkName } = resolveLitNetwork();
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
  const context = await getContext();
  const account = await context.litClient.getPkpViemAccount({
    pkpPublicKey: context.pkpPublicKey,
    authContext: context.authContext as never,
    chainConfig: resolveChainConfig(params.chainId),
  });

  return (await account.signTypedData(params.typedData as never)) as Hex;
}
