import "server-only";

import { createHash, createHmac } from "node:crypto";

function evidenceSecret() {
  const secret =
    process.env.EVIDENCE_HMAC_SECRET?.trim() ??
    process.env.HUMANITY_TOKEN_SECRET?.trim() ??
    process.env.WORLD_TOKEN_SECRET?.trim();
  if (!secret) throw new Error("Missing EVIDENCE_HMAC_SECRET");
  return secret;
}

export function evidenceFingerprint(kind: string, value: string) {
  return createHmac("sha256", evidenceSecret()).update(`${kind}:${value}`).digest("hex");
}

export function evidenceHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function evidenceCommitment(values: string[]) {
  return `0x${createHmac("sha256", evidenceSecret()).update(values.join("\u001f")).digest("hex")}`;
}
