import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";
import { generateSessionToken, hashSessionToken } from "./session-token";

describe("Auth primitives", () => {
  it("hashes and verifies password using Argon2id", async () => {
    const password = "SuperSecretPassword123!";
    const hashed = await hashPassword(password);
    expect(hashed).toBeDefined();
    expect(hashed).not.toBe(password);

    const isValid = await verifyPassword(password, hashed);
    expect(isValid).toBe(true);

    const isInvalid = await verifyPassword("WrongPassword", hashed);
    expect(isInvalid).toBe(false);
  });

  it("generates high-entropy session tokens and deterministic hashes", () => {
    const token1 = generateSessionToken();
    const token2 = generateSessionToken();
    expect(token1).not.toBe(token2);
    expect(token1.length).toBeGreaterThanOrEqual(40);

    const hash1 = hashSessionToken(token1);
    const hash1Again = hashSessionToken(token1);
    expect(hash1).toBe(hash1Again);
    expect(hash1).not.toBe(hashSessionToken(token2));
  });
});
