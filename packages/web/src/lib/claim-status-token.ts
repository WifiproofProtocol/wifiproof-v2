import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

function secret() {
  const value = process.env.CLAIM_STATUS_TOKEN_SECRET?.trim() ?? process.env.HUMANITY_TOKEN_SECRET?.trim();
  if (!value) throw new Error("Missing CLAIM_STATUS_TOKEN_SECRET");
  return value;
}

export function issueClaimStatusToken(jobId: string) {
  return createHmac("sha256", secret()).update(jobId).digest("base64url");
}

export function verifyClaimStatusToken(jobId: string, token: string) {
  const expected = Buffer.from(issueClaimStatusToken(jobId));
  const supplied = Buffer.from(token);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
