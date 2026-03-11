import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_WORLD_VERIFY_BASE_URL = "https://developer.world.org/api/v4/verify";
const DEFAULT_TOKEN_TTL_SECONDS = 15 * 60;

const HEX_RE = /^0x[0-9a-f]+$/;
const ADDRESS_RE = /^0x[0-9a-f]{40}$/;
const BYTES32_RE = /^0x[0-9a-f]{64}$/;

export type WorldIDKitResult = {
  protocol_version?: string;
  nonce?: string;
  action?: string;
  responses?: Array<{
    identifier?: string;
    signal_hash?: string;
    proof?: string | string[];
    merkle_root?: string;
    nullifier?: string;
  }>;
};

export type WorldVerifyResult = {
  nullifierHash: string;
  verificationLevel: string;
  signalHash?: string;
  raw: unknown;
};

export type WorldTokenClaims = {
  wallet: `0x${string}`;
  eventId: `0x${string}`;
  nullifierHash: `0x${string}`;
  iat: number;
  exp: number;
};

function normalizeHex(value: string): `0x${string}` {
  const lower = value.trim().toLowerCase();
  if (!HEX_RE.test(lower)) {
    throw new Error("Expected hex string");
  }
  return lower as `0x${string}`;
}

export function requireAddress(value: string): `0x${string}` {
  const normalized = normalizeHex(value);
  if (!ADDRESS_RE.test(normalized)) {
    throw new Error("Invalid wallet format");
  }
  return normalized;
}

export function requireBytes32(value: string): `0x${string}` {
  const normalized = normalizeHex(value);
  if (!BYTES32_RE.test(normalized)) {
    throw new Error("Invalid bytes32 format");
  }
  return normalized;
}

function getWorldVerifyTargetId(): string {
  return (
    process.env.RP_ID?.trim() ??
    process.env.WORLD_RP_ID?.trim() ??
    process.env.NEXT_PUBLIC_WORLD_RP_ID?.trim() ??
    process.env.WORLD_APP_ID?.trim() ??
    process.env.NEXT_PUBLIC_WORLD_APP_ID?.trim() ??
    ""
  );
}

function getWorldTokenSecret(): string {
  const secret = process.env.WORLD_TOKEN_SECRET?.trim();
  if (!secret) {
    throw new Error("Missing WORLD_TOKEN_SECRET");
  }
  return secret;
}

function extractFirstResponse(
  result: WorldIDKitResult
): NonNullable<WorldIDKitResult["responses"]>[number] {
  const first = result.responses?.[0];
  if (!first) {
    throw new Error("World result missing responses[0]");
  }
  return first;
}

function readNullifierFromVerifyBody(
  body: Record<string, unknown>,
  fallback: string
): `0x${string}` {
  const direct = body.nullifier;
  if (typeof direct === "string") {
    return normalizeHex(direct);
  }

  const results = body.results;
  if (Array.isArray(results) && results.length > 0) {
    const first = results[0] as Record<string, unknown>;
    if (typeof first.nullifier === "string") {
      return normalizeHex(first.nullifier);
    }
  }

  return normalizeHex(fallback);
}

function readSignalHashFromVerifyBody(body: Record<string, unknown>): `0x${string}` | undefined {
  const direct = body.signal_hash;
  if (typeof direct === "string") {
    return normalizeHex(direct);
  }

  const results = body.results;
  if (Array.isArray(results) && results.length > 0) {
    const first = results[0] as Record<string, unknown>;
    if (typeof first.signal_hash === "string") {
      return normalizeHex(first.signal_hash);
    }
  }

  return undefined;
}

export async function verifyWorldResultOnServer(params: {
  wallet: string;
  eventId: string;
  idkitResult: WorldIDKitResult;
}): Promise<WorldVerifyResult> {
  requireAddress(params.wallet);
  requireBytes32(params.eventId);

  const targetId = getWorldVerifyTargetId();
  if (!targetId) {
    throw new Error("Missing RP_ID or WORLD_APP_ID");
  }

  const firstResponse = extractFirstResponse(params.idkitResult);
  if (typeof firstResponse.nullifier !== "string") {
    throw new Error("World result missing nullifier");
  }

  const baseUrl = process.env.WORLD_VERIFY_BASE_URL?.trim() ?? DEFAULT_WORLD_VERIFY_BASE_URL;
  const url = `${baseUrl.replace(/\/$/, "")}/${encodeURIComponent(targetId)}`;

  const headers: Record<string, string> = {
    "content-type": "application/json",
  };

  const clientSecret = process.env.WORLD_CLIENT_SECRET?.trim();
  if (clientSecret) {
    headers.authorization = `Bearer ${clientSecret}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(params.idkitResult),
  });

  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const success = body.success === true;

  if (!response.ok || !success) {
    const detail =
      typeof body.detail === "string"
        ? body.detail
        : typeof body.code === "string"
          ? body.code
          : `HTTP ${response.status}`;
    throw new Error(`World verification failed: ${detail}`);
  }

  return {
    nullifierHash: readNullifierFromVerifyBody(body, firstResponse.nullifier),
    verificationLevel:
      typeof firstResponse.identifier === "string" && firstResponse.identifier.length > 0
        ? firstResponse.identifier
        : "orb",
    signalHash: readSignalHashFromVerifyBody(body),
    raw: body,
  };
}

function sign(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function issueWorldToken(input: {
  wallet: string;
  eventId: string;
  nullifierHash: string;
  ttlSeconds?: number;
}): { token: string; claims: WorldTokenClaims } {
  const now = Math.floor(Date.now() / 1000);
  const ttlSeconds =
    Number.isFinite(input.ttlSeconds) && (input.ttlSeconds ?? 0) > 0
      ? Number(input.ttlSeconds)
      : Number(process.env.WORLD_TOKEN_TTL_SECONDS ?? DEFAULT_TOKEN_TTL_SECONDS);

  const claims: WorldTokenClaims = {
    wallet: requireAddress(input.wallet),
    eventId: requireBytes32(input.eventId),
    nullifierHash: normalizeHex(input.nullifierHash),
    iat: now,
    exp: now + ttlSeconds,
  };

  const encodedPayload = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  const signature = sign(encodedPayload, getWorldTokenSecret());

  return {
    token: `${encodedPayload}.${signature}`,
    claims,
  };
}

export function verifyWorldToken(token: string): WorldTokenClaims | null {
  try {
    const [encodedPayload, providedSignature] = token.split(".");
    if (!encodedPayload || !providedSignature) {
      return null;
    }

    const expectedSignature = sign(encodedPayload, getWorldTokenSecret());
    const providedBuffer = Buffer.from(providedSignature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (providedBuffer.length !== expectedBuffer.length) {
      return null;
    }
    if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
      return null;
    }

    const claims = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as WorldTokenClaims;

    if (!claims || typeof claims !== "object") {
      return null;
    }

    const wallet = requireAddress(claims.wallet);
    const eventId = requireBytes32(claims.eventId);
    const nullifierHash = normalizeHex(claims.nullifierHash);

    if (
      typeof claims.iat !== "number" ||
      !Number.isInteger(claims.iat) ||
      typeof claims.exp !== "number" ||
      !Number.isInteger(claims.exp)
    ) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (claims.exp <= now) {
      return null;
    }

    return {
      wallet,
      eventId,
      nullifierHash,
      iat: claims.iat,
      exp: claims.exp,
    };
  } catch {
    return null;
  }
}
