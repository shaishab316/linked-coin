import { describe, expect, it } from "vitest";

import {
  normalizeUsername,
  signInSchema,
  signUpSchema,
  usernameSchema,
} from "./validation";

describe("username normalization", () => {
  it("trims and lowercases usernames", () => {
    expect(normalizeUsername("  Ada_Lovelace  ")).toBe("ada_lovelace");
  });

  it("normalizes valid usernames through the schema", () => {
    expect(usernameSchema.parse("  Ada_1 ")).toBe("ada_1");
  });

  it("rejects usernames with spaces or symbols", () => {
    for (const username of ["ada lovelace", "ada!", "ad", "a".repeat(33)]) {
      expect(usernameSchema.safeParse(username).success).toBe(false);
    }
  });
});

describe("sign-up validation", () => {
  it("accepts a valid username/password pair", () => {
    expect(
      signUpSchema.parse({ username: "Ada", password: "long-enough" }),
    ).toEqual({ username: "ada", password: "long-enough" });
  });

  it("rejects passwords shorter than the minimum", () => {
    expect(
      signUpSchema.safeParse({ username: "ada", password: "short" }).success,
    ).toBe(false);
  });

  it("rejects overly long passwords", () => {
    expect(
      signUpSchema.safeParse({
        username: "ada",
        password: "a".repeat(201),
      }).success,
    ).toBe(false);
  });
});

describe("sign-in validation", () => {
  it("normalizes the username but does not enforce password strength", () => {
    expect(
      signInSchema.parse({ username: "  Ada ", password: "x" }),
    ).toEqual({ username: "ada", password: "x" });
  });

  it("requires a password", () => {
    expect(
      signInSchema.safeParse({ username: "ada", password: "" }).success,
    ).toBe(false);
  });
});
