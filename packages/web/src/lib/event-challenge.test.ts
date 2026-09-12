import { beforeEach, describe, expect, it } from "vitest";

import { issueEventChallenge, verifyEventChallenge } from "./event-challenge";

const EVENT_ID = `0x${"12".repeat(32)}`;

describe("rotating venue challenge", () => {
  beforeEach(() => {
    process.env.EVENT_CHALLENGE_SECRET = "test-event-challenge-secret-with-enough-entropy";
  });

  it("is stable within a 30-second slot and rotates in the next slot", () => {
    const first = issueEventChallenge(EVENT_ID, 1_800_000_001);
    const sameSlot = issueEventChallenge(EVENT_ID, 1_800_000_029);
    const nextSlot = issueEventChallenge(EVENT_ID, 1_800_000_030);
    expect(first.token).toBe(sameSlot.token);
    expect(nextSlot.token).not.toBe(first.token);
  });

  it("accepts only the matching event inside the 60-second window", () => {
    const issued = issueEventChallenge(EVENT_ID, 1_800_000_001);
    expect(verifyEventChallenge(issued.token, EVENT_ID, 1_800_000_050)).not.toBeNull();
    expect(verifyEventChallenge(issued.token, `0x${"34".repeat(32)}`, 1_800_000_050)).toBeNull();
    expect(verifyEventChallenge(issued.token, EVENT_ID, 1_800_000_061)).toBeNull();
  });

  it("rejects a tampered token", () => {
    const issued = issueEventChallenge(EVENT_ID, 1_800_000_001);
    expect(verifyEventChallenge(`${issued.token}x`, EVENT_ID, 1_800_000_010)).toBeNull();
  });
});
