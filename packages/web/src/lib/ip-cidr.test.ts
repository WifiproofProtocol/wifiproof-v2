import { describe, expect, it } from "vitest";

import { exactCidrForIp, isIpInCidrs, normalizeCidr, normalizeIpAddress } from "./ip-cidr";

describe("venue CIDR validation", () => {
  it("uses an exact IPv4 host range by default", () => {
    expect(exactCidrForIp("203.0.113.42")).toBe("203.0.113.42/32");
    expect(isIpInCidrs("203.0.113.42", ["203.0.113.42/32"])).toBe(true);
    expect(isIpInCidrs("203.0.113.420", ["203.0.113.42/32"])).toBe(false);
    expect(isIpInCidrs("203.0.113.43", ["203.0.113.42/32"])).toBe(false);
  });

  it("matches real IPv4 and IPv6 network boundaries", () => {
    expect(isIpInCidrs("198.51.100.127", ["198.51.100.0/25"])).toBe(true);
    expect(isIpInCidrs("198.51.100.128", ["198.51.100.0/25"])).toBe(false);
    expect(isIpInCidrs("2001:db8::beef", ["2001:db8::/64"])).toBe(true);
    expect(isIpInCidrs("2001:db8:1::beef", ["2001:db8::/64"])).toBe(false);
  });

  it("normalizes mapped addresses and rejects malformed ranges", () => {
    expect(normalizeIpAddress("::ffff:192.0.2.8")).toBe("192.0.2.8");
    expect(normalizeCidr("192.0.2.8")).toBe("192.0.2.8/32");
    expect(() => normalizeCidr("203.0.113.999/24")).toThrow(/valid IPv4 or IPv6 CIDR/);
  });
});
