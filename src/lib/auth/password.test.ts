import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("produces an Argon2id hash that is not the plaintext password", async () => {
    const passwordHash = await hashPassword("correct horse battery staple");

    expect(passwordHash.startsWith("$argon2id$")).toBe(true);
    expect(passwordHash).not.toContain("correct horse battery staple");
  });

  it("uses a unique salt per hash", async () => {
    const [first, second] = await Promise.all([
      hashPassword("same-password"),
      hashPassword("same-password"),
    ]);

    expect(first).not.toBe(second);
  });

  it("verifies the matching password", async () => {
    const passwordHash = await hashPassword("s3cret-passphrase");

    await expect(verifyPassword(passwordHash, "s3cret-passphrase")).resolves.toBe(
      true,
    );
  });

  it("rejects a wrong password", async () => {
    const passwordHash = await hashPassword("s3cret-passphrase");

    await expect(verifyPassword(passwordHash, "s3cret-passphras")).resolves.toBe(
      false,
    );
  });

  it("returns false for malformed hashes instead of throwing", async () => {
    await expect(verifyPassword("not-a-hash", "anything")).resolves.toBe(false);
  });
});
