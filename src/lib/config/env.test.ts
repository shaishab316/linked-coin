import { describe, expect, it } from "vitest";

import { parseServerEnv } from "./env";

const validSource = {
  DATABASE_URL: "postgresql://user:password@localhost:5432/linked_coin",
  SESSION_SECRET: "a".repeat(32),
  APP_URL: "http://localhost:3000",
  NODE_ENV: "development" as const,
};

describe("parseServerEnv", () => {
  it("accepts a complete configuration", () => {
    expect(parseServerEnv(validSource)).toEqual(validSource);
  });

  it("rejects a missing DATABASE_URL", () => {
    expect(() =>
      parseServerEnv({ ...validSource, DATABASE_URL: undefined as never }),
    ).toThrow(/DATABASE_URL/);
  });

  it("rejects non-PostgreSQL connection strings", () => {
    expect(() =>
      parseServerEnv({ ...validSource, DATABASE_URL: "sqlite://local.db" }),
    ).toThrow(/PostgreSQL/);
  });

  it("rejects short session secrets", () => {
    expect(() =>
      parseServerEnv({ ...validSource, SESSION_SECRET: "too-short" }),
    ).toThrow(/SESSION_SECRET/);
  });

  it("rejects malformed application URLs", () => {
    expect(() =>
      parseServerEnv({ ...validSource, APP_URL: "not-a-url" }),
    ).toThrow(/APP_URL/);
  });
});
