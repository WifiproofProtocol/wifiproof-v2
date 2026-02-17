import fs from "node:fs";
import path from "node:path";

import { WiFiProofProver, buildInputs } from "../dist/index.mjs";

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function parseNumber(value, name) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid number for ${name}: ${value}`);
  }
  return parsed;
}

function toBytes32Hex(value) {
  const big = typeof value === "string" && value.startsWith("0x")
    ? BigInt(value)
    : BigInt(value);
  const hex = big.toString(16).padStart(64, "0");
  return `0x${hex}`;
}

function uint8ArrayToHex(bytes) {
  return `0x${Buffer.from(bytes).toString("hex")}`;
}

async function main() {
  const circuitPath = path.resolve(
    process.cwd(),
    "circuit",
    "target",
    "circuit.json"
  );

  if (!fs.existsSync(circuitPath)) {
    throw new Error(
      `Missing circuit artifact at ${circuitPath}. Run: pnpm --filter @wifiproof/proof-app build`
    );
  }

  const userLat = parseNumber(requiredEnv("USER_LAT"), "USER_LAT");
  const userLon = parseNumber(requiredEnv("USER_LON"), "USER_LON");
  const venueLat = parseNumber(requiredEnv("VENUE_LAT"), "VENUE_LAT");
  const venueLon = parseNumber(requiredEnv("VENUE_LON"), "VENUE_LON");
  const radiusMeters = parseNumber(requiredEnv("RADIUS_METERS"), "RADIUS_METERS");
  const eventId = requiredEnv("EVENT_ID");

  const wallet = process.env.WALLET_ADDRESS;
  const wifiproofAddress = process.env.WIFIPROOF_ADDRESS ?? "";
  const venueHash = process.env.VENUE_HASH ?? "";

  const sigDeadlineEnv = process.env.SIG_DEADLINE;
  const sigDeadline = sigDeadlineEnv
    ? Number(sigDeadlineEnv)
    : Math.floor(Date.now() / 1000) + 120;

  const circuitJson = JSON.parse(fs.readFileSync(circuitPath, "utf8"));

  const inputs = buildInputs(
    { lat: userLat, lon: userLon },
    { lat: venueLat, lon: venueLon },
    radiusMeters,
    eventId
  );

  const prover = new WiFiProofProver();
  await prover.init(circuitJson);
  const { proof, publicInputs } = await prover.generateProof(inputs);
  await prover.destroy();

  const proofHex = uint8ArrayToHex(proof);
  const publicInputsBytes32 = publicInputs.map(toBytes32Hex);

  let ipSignature = process.env.IP_SIGNATURE ?? "0x";
  const ipVerifyUrl = process.env.IP_VERIFY_URL;

  if (ipVerifyUrl && wallet && venueHash && ipSignature === "0x") {
    const response = await fetch(ipVerifyUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        wallet,
        eventId,
        venueHash,
        deadline: sigDeadline,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`IP verify failed (${response.status}): ${text}`);
    }

    const json = await response.json();
    if (!json.signature) {
      throw new Error("IP verify response missing signature");
    }
    ipSignature = json.signature;
  }

  const output = {
    wifiproof: wifiproofAddress,
    eventId,
    sigDeadline,
    proof: proofHex,
    publicInputs: publicInputsBytes32,
    ipSignature,
  };

  const outputPath = process.env.CLAIM_JSON
    ? path.resolve(process.env.CLAIM_JSON)
    : path.resolve(process.cwd(), "..", "contracts", "claim.json");

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`Claim JSON written to: ${outputPath}`);
  if (ipSignature === "0x") {
    console.log("IP signature missing. Set IP_SIGNATURE or provide IP_VERIFY_URL + WALLET_ADDRESS + VENUE_HASH.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
