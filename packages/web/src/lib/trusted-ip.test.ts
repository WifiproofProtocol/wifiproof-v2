import { afterEach, describe, expect, it, vi } from "vitest";

import { getTrustedClientIp } from "./trusted-ip";

function request(headers: Record<string, string>) {
  return new Request("https://wifiproof.example/api", { headers });
}

describe("trusted client IP", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses the hosting platform's trusted header", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(
      getTrustedClientIp(
        request({ "x-vercel-forwarded-for": "203.0.113.42, 10.0.0.1", "x-forwarded-for": "198.51.100.9" }),
      ),
    ).toBe("203.0.113.42");
  });

  it("ignores user-controlled forwarding headers in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(getTrustedClientIp(request({ "x-forwarded-for": "203.0.113.42" }))).toBeNull();
  });

  it("allows local forwarding headers only during development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(getTrustedClientIp(request({ "x-forwarded-for": "::ffff:192.0.2.8" }))).toBe("192.0.2.8");
  });
});
