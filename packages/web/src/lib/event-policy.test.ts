import { describe, expect, it } from "vitest";

import { computeEventMetadataHash } from "./event-policy";

describe("event policy metadata commitment", () => {
  const metadata = {
    venueName: "Signal Hall",
    eventDescription: "A private attendance pilot",
    venueCidr: "203.0.113.42/32",
    posterImageUrl: "https://example.test/poster.webp",
  };

  it("is deterministic and binds every persisted metadata field", () => {
    const hash = computeEventMetadataHash(metadata);
    expect(computeEventMetadataHash({ ...metadata })).toBe(hash);
    expect(computeEventMetadataHash({ ...metadata, venueName: "Other Hall" })).not.toBe(hash);
    expect(computeEventMetadataHash({ ...metadata, venueCidr: "203.0.113.43/32" })).not.toBe(hash);
  });
});
