import * as Client from "@storacha/client";
import * as Proof from "@storacha/client/proof";
import { Signer } from "@storacha/client/principal/ed25519";
import { StoreMemory } from "@storacha/client/stores/memory";

export type AttendanceArtifactPayload = {
  eventId: `0x${string}`;
  wallet: `0x${string}`;
  txHash: `0x${string}`;
  attestationUid: `0x${string}`;
  proofHash: `0x${string}`;
  publicInputsHash: `0x${string}`;
  network: string;
  timestamp: number;
};

type StorachaClient = Awaited<ReturnType<typeof Client.create>>;

let cachedClientPromise: Promise<StorachaClient> | null = null;

async function getStorachaClient(): Promise<StorachaClient> {
  if (cachedClientPromise) {
    return cachedClientPromise;
  }

  cachedClientPromise = (async () => {
    const key = process.env.STORACHA_KEY?.trim();
    const proofBase64 = process.env.STORACHA_PROOF?.trim();
    const expectedSpaceDid = process.env.STORACHA_SPACE_DID?.trim();

    if (!key || !proofBase64) {
      throw new Error("Missing STORACHA_KEY or STORACHA_PROOF");
    }

    // BYO delegation flow for server/ephemeral environments.
    const principal = Signer.parse(key);
    const store = new StoreMemory();
    const client = await Client.create({ principal, store });
    const delegation = await Proof.parse(proofBase64);
    const space = await client.addSpace(delegation);
    await client.setCurrentSpace(space.did());

    if (expectedSpaceDid && expectedSpaceDid !== space.did()) {
      throw new Error(
        `Storacha space mismatch: expected ${expectedSpaceDid}, got ${space.did()}`
      );
    }

    return client;
  })();

  return cachedClientPromise;
}

export async function uploadAttendanceArtifact(
  artifact: AttendanceArtifactPayload
): Promise<string> {
  const client = await getStorachaClient();
  const payload = JSON.stringify({ artifact }, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const root = await client.uploadFile(blob);
  return root.toString();
}
