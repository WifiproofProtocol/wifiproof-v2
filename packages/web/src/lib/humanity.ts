import { createHmac, timingSafeEqual } from "node:crypto";

import { requireAddress, requireBytes32 } from "@/lib/world";

const DEFAULT_TOKEN_TTL_SECONDS = 15 * 60;

export type HumanityProvider = "world" | "coinbase" | "self";

export type HumanityTokenClaims = {
  wallet: `0x${string}`;
  eventId: `0x${string}`;
  provider: HumanityProvider;
  iat: number;
  exp: number;
};

function getHumanityTokenSecret(): string {
  const secret =
    process.env.HUMANITY_TOKEN_SECRET?.trim() ?? process.env.WORLD_TOKEN_SECRET?.trim();
  if (!secret) {
    throw new Error("Missing HUMANITY_TOKEN_SECRET or WORLD_TOKEN_SECRET");
  }
  return secret;
}

function sign(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

export function issueHumanityToken(input: {
  wallet: string;
  eventId: string;
  provider: HumanityProvider;
  ttlSeconds?: number;
}): { token: string; claims: HumanityTokenClaims } {
  const now = Math.floor(Date.now() / 1000);
  const ttlSeconds =
    Number.isFinite(input.ttlSeconds) && (input.ttlSeconds ?? 0) > 0
      ? Number(input.ttlSeconds)
      : Number(process.env.HUMANITY_TOKEN_TTL_SECONDS ?? DEFAULT_TOKEN_TTL_SECONDS);

  const claims: HumanityTokenClaims = {
    wallet: requireAddress(input.wallet),
    eventId: requireBytes32(input.eventId),
    provider: input.provider,
    iat: now,
    exp: now + ttlSeconds,
  };

  const encodedPayload = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  const signature = sign(encodedPayload, getHumanityTokenSecret());

  return {
    token: `${encodedPayload}.${signature}`,
    claims,
  };
}

export function verifyHumanityToken(token: string): HumanityTokenClaims | null {
  try {
    const [encodedPayload, providedSignature] = token.split(".");
    if (!encodedPayload || !providedSignature) {
      return null;
    }

    const expectedSignature = sign(encodedPayload, getHumanityTokenSecret());
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
    ) as HumanityTokenClaims;

    if (!claims || typeof claims !== "object") {
      return null;
    }

    if (
      claims.provider !== "world" &&
      claims.provider !== "coinbase" &&
      claims.provider !== "self"
    ) {
      return null;
    }

    const wallet = requireAddress(claims.wallet);
    const eventId = requireBytes32(claims.eventId);

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
      provider: claims.provider,
      iat: claims.iat,
      exp: claims.exp,
    };
  } catch {
    return null;
  }
}
