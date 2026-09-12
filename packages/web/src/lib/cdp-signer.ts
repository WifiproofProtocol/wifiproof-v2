import "server-only";

import { CdpClient } from "@coinbase/cdp-sdk";
import { getAddress, hashTypedData, recoverAddress, type Hex } from "viem";

import type { TypedDataPayload } from "@/lib/lit-signer";

let cdpClient: CdpClient | undefined;

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function client() {
  cdpClient ??= new CdpClient();
  return cdpClient;
}

export async function signTypedDataWithCdp(params: {
  typedData: TypedDataPayload;
}): Promise<Hex> {
  const accountName =
    process.env.CDP_AUTHORIZER_ACCOUNT_NAME?.trim() || "wifiproof-v2-authorizer";
  const expectedSigner = getAddress(requireEnv("CDP_AUTHORIZER_ADDRESS"));
  const account = await client().evm.getAccount({ name: accountName });
  const accountAddress = getAddress(account.address);

  if (accountAddress !== expectedSigner) {
    throw new Error(
      `CDP authorizer mismatch: account ${accountAddress}, expected ${expectedSigner}`,
    );
  }

  const signature = (await account.signTypedData(params.typedData as never)) as Hex;
  const digest = hashTypedData(params.typedData as never);
  const recovered = getAddress(await recoverAddress({ hash: digest, signature }));

  if (recovered !== expectedSigner) {
    throw new Error(`CDP signer mismatch: recovered ${recovered}, expected ${expectedSigner}`);
  }

  return signature;
}
