import { createHmac, timingSafeEqual } from "node:crypto";

type EventMetadataClaims = {
  organizer: `0x${string}`;
  eventId: `0x${string}`;
  venueHash: `0x${string}`;
  startTime: number;
  endTime: number;
  venueName: string;
  subnetPrefix: string;
  iat: number;
  exp: number;
};

const ADDRESS_RE = /^0x[0-9a-f]{40}$/;
const BYTES32_RE = /^0x[0-9a-f]{64}$/;
const DEFAULT_TTL_SECONDS = 15 * 60;

function requireSecret(): string {
  const secret =
    process.env.EVENT_METADATA_TOKEN_SECRET?.trim() ??
    process.env.WORLD_TOKEN_SECRET?.trim();

  if (!secret) {
    throw new Error("Missing EVENT_METADATA_TOKEN_SECRET or WORLD_TOKEN_SECRET");
  }

  return secret;
}

function sign(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

function normalizeAddress(value: string): `0x${string}` {
  const normalized = value.trim().toLowerCase();
  if (!ADDRESS_RE.test(normalized)) {
    throw new Error("Invalid organizer address");
  }
  return normalized as `0x${string}`;
}

function normalizeBytes32(value: string, label: string): `0x${string}` {
  const normalized = value.trim().toLowerCase();
  if (!BYTES32_RE.test(normalized)) {
    throw new Error(`Invalid ${label}`);
  }
  return normalized as `0x${string}`;
}

export function issueEventMetadataToken(input: {
  organizer: string;
  eventId: string;
  venueHash: string;
  startTime: number;
  endTime: number;
  venueName: string;
  subnetPrefix: string;
  ttlSeconds?: number;
}): { token: string; claims: EventMetadataClaims } {
  const now = Math.floor(Date.now() / 1000);
  const ttlSeconds =
    Number.isFinite(input.ttlSeconds) && (input.ttlSeconds ?? 0) > 0
      ? Number(input.ttlSeconds)
      : Number(process.env.EVENT_METADATA_TOKEN_TTL_SECONDS ?? DEFAULT_TTL_SECONDS);

  const claims: EventMetadataClaims = {
    organizer: normalizeAddress(input.organizer),
    eventId: normalizeBytes32(input.eventId, "eventId"),
    venueHash: normalizeBytes32(input.venueHash, "venueHash"),
    startTime: Number(input.startTime),
    endTime: Number(input.endTime),
    venueName: input.venueName.trim(),
    subnetPrefix: input.subnetPrefix.trim(),
    iat: now,
    exp: now + ttlSeconds,
  };

  const encodedPayload = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  const signature = sign(encodedPayload, requireSecret());

  return {
    token: `${encodedPayload}.${signature}`,
    claims,
  };
}

export function verifyEventMetadataToken(token: string): EventMetadataClaims | null {
  try {
    const [encodedPayload, providedSignature] = token.split(".");
    if (!encodedPayload || !providedSignature) {
      return null;
    }

    const expectedSignature = sign(encodedPayload, requireSecret());
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
    ) as EventMetadataClaims;

    if (!claims || typeof claims !== "object") {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (
      !Number.isInteger(claims.startTime) ||
      !Number.isInteger(claims.endTime) ||
      !Number.isInteger(claims.iat) ||
      !Number.isInteger(claims.exp) ||
      claims.exp <= now
    ) {
      return null;
    }

    return {
      organizer: normalizeAddress(claims.organizer),
      eventId: normalizeBytes32(claims.eventId, "eventId"),
      venueHash: normalizeBytes32(claims.venueHash, "venueHash"),
      startTime: claims.startTime,
      endTime: claims.endTime,
      venueName: claims.venueName.trim(),
      subnetPrefix: claims.subnetPrefix.trim(),
      iat: claims.iat,
      exp: claims.exp,
    };
  } catch {
    return null;
  }
}
