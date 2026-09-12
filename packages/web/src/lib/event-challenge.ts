import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const CHALLENGE_SECONDS = 30;
const ACCEPTED_AGE_SECONDS = 60;

type EventChallenge = {
  eventId: string;
  slot: number;
  issuedAt: number;
  expiresAt: number;
};

function getSecret() {
  const secret =
    process.env.EVENT_CHALLENGE_SECRET?.trim() ||
    process.env.EVENT_METADATA_TOKEN_SECRET?.trim() ||
    process.env.WORLD_TOKEN_SECRET?.trim();
  if (!secret) throw new Error("EVENT_CHALLENGE_SECRET is not configured");
  return secret;
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

export function issueEventChallenge(eventId: string, now = Math.floor(Date.now() / 1000)) {
  const slot = Math.floor(now / CHALLENGE_SECONDS);
  const challenge: EventChallenge = {
    eventId: eventId.toLowerCase(),
    slot,
    issuedAt: slot * CHALLENGE_SECONDS,
    expiresAt: (slot + 2) * CHALLENGE_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(challenge)).toString("base64url");
  return {
    token: `${encoded}.${sign(encoded)}`,
    challenge,
    challengeHash: createHmac("sha256", getSecret()).update(`${eventId.toLowerCase()}:${slot}`).digest("hex"),
  };
}

export function verifyEventChallenge(token: string, expectedEventId: string, now = Math.floor(Date.now() / 1000)) {
  try {
    const [encoded, supplied] = token.split(".");
    if (!encoded || !supplied) return null;
    const expected = sign(encoded);
    const a = Buffer.from(supplied);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const challenge = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as EventChallenge;
    if (
      challenge.eventId !== expectedEventId.toLowerCase() ||
      !Number.isInteger(challenge.slot) ||
      challenge.issuedAt > now + 5 ||
      now - challenge.issuedAt > ACCEPTED_AGE_SECONDS ||
      challenge.expiresAt < now
    ) return null;
    return {
      ...challenge,
      challengeHash: createHmac("sha256", getSecret()).update(`${challenge.eventId}:${challenge.slot}`).digest("hex"),
    };
  } catch {
    return null;
  }
}

export function challengeDisplayMessage(eventId: string, organizer: string, issuedAt: number) {
  return [
    "WiFiProof venue display",
    `Event: ${eventId.toLowerCase()}`,
    `Organizer: ${organizer.toLowerCase()}`,
    `Issued at: ${issuedAt}`,
    "Purpose: authorize rotating in-venue check-in challenges",
  ].join("\n");
}
