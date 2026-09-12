/**
 * Idempotently provisions separate CDP accounts for attendance authorization
 * and transaction relay. This script prints public addresses only.
 *
 * Required environment variables:
 *   CDP_API_KEY_ID
 *   CDP_API_KEY_SECRET
 *   CDP_WALLET_SECRET
 */
import { CdpClient } from "@coinbase/cdp-sdk";
import { getAddress } from "viem";

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function main() {
  requireEnv("CDP_API_KEY_ID");
  requireEnv("CDP_API_KEY_SECRET");
  requireEnv("CDP_WALLET_SECRET");

  const authorizerName =
    process.env.CDP_AUTHORIZER_ACCOUNT_NAME?.trim() || "wifiproof-v2-authorizer";
  const relayOwnerName =
    process.env.CDP_RELAY_OWNER_NAME?.trim() || "wifiproof-relay-owner";
  const relayName =
    process.env.CDP_RELAY_ACCOUNT_NAME?.trim() || "wifiproof-attendance-relay";

  const cdp = new CdpClient();
  const authorizer = await cdp.evm.getOrCreateAccount({ name: authorizerName });
  const relayOwner = await cdp.evm.getOrCreateAccount({ name: relayOwnerName });

  if (getAddress(authorizer.address) === getAddress(relayOwner.address)) {
    throw new Error("CDP authorizer and relay owner must be separate accounts");
  }

  const relay = await cdp.evm.getOrCreateSmartAccount({
    name: relayName,
    owner: relayOwner,
  });

  console.log("CDP provisioning complete (public addresses):");
  console.log(`CDP_AUTHORIZER_ACCOUNT_NAME=${authorizerName}`);
  console.log(`CDP_AUTHORIZER_ADDRESS=${getAddress(authorizer.address)}`);
  console.log(`CDP_RELAY_OWNER_NAME=${relayOwnerName}`);
  console.log(`CDP_RELAY_OWNER_ADDRESS=${getAddress(relayOwner.address)}`);
  console.log(`CDP_RELAY_ACCOUNT_NAME=${relayName}`);
  console.log(`CDP_RELAY_ADDRESS=${getAddress(relay.address)}`);
  console.log(`CDP_RELAY_POLICY_ATTACHED=${Boolean(relay.policies?.length)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
