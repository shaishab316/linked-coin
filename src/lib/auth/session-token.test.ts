import { describe, expect, it } from "vitest";

import { generateSessionToken, hashSessionToken } from "./session-token";

describe("session tokens", () => {
  it("generates distinct URL-safe 256-bit tokens", () => {
    const tokens = new Set(Array.from({ length: 20 }, generateSessionToken));

    expect(tokens.size).toBe(20);

    for (const token of tokens) {
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(Buffer.from(token, "base64url")).toHaveLength(32);
    }
  });

  it("hashes deterministically to a SHA-256 hex digest", () => {
    const token = generateSessionToken();
    const hash = hashSessionToken(token);

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSessionToken(token)).toBe(hash);
    expect(hash).not.toBe(token);
  });
});
