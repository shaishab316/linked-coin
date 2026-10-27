import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";

import { AppError } from "@/lib/errors/app-error";
import { hashSessionToken, generateSessionToken } from "@/lib/auth/session-token";
import {
  createTestContext,
  hasTestDatabase,
  type TestContext,
} from "../../../tests/helpers/database";

import {
  authenticateUser,
  createSessionRecord,
  findActiveSession,
  registerUser,
  revokeSession,
  SESSION_DURATION_MS,
  touchSession,
} from "./service";

describe.skipIf(!hasTestDatabase)("auth service (PostgreSQL)", () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestContext();
  });

  beforeEach(async () => {
    await context.reset();
  });

  afterAll(async () => {
    await context?.close();
  });

  it("stores an Argon2id hash instead of the password", async () => {
    const user = await registerUser(context.db, {
      username: "ada",
      password: "correct-horse",
    });

    const rows = await context.db.query.users.findMany();

    expect(user.username).toBe("ada");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.passwordHash.startsWith("$argon2id$")).toBe(true);
    expect(rows[0]?.passwordHash).not.toContain("correct-horse");
  });

  it("rejects a duplicate username regardless of case", async () => {
    await registerUser(context.db, { username: "ada", password: "first-password" });

    const attempt = registerUser(context.db, {
      username: "ada",
      password: "second-password",
    });

    await expect(attempt).rejects.toMatchObject({ code: "USERNAME_TAKEN" });

    const rows = await context.db.query.users.findMany();
    expect(rows).toHaveLength(1);
  });

  it("signs in with the correct password only", async () => {
    const user = await registerUser(context.db, {
      username: "ada",
      password: "correct-horse",
    });

    await expect(
      authenticateUser(context.db, { username: "ada", password: "wrong-password" }),
    ).resolves.toBeNull();

    await expect(
      authenticateUser(context.db, { username: "ada", password: "correct-horse" }),
    ).resolves.toEqual(user);
  });

  it("resolves an active session to its owner", async () => {
    const user = await registerUser(context.db, {
      username: "ada",
      password: "correct-horse",
    });
    const token = generateSessionToken();

    await createSessionRecord(context.db, {
      userId: user.id,
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
    });

    const session = await findActiveSession(
      context.db,
      hashSessionToken(token),
    );

    expect(session?.user).toEqual(user);
    expect(session?.sessionId).toBeTruthy();
  });

  it("does not resolve revoked sessions", async () => {
    const user = await registerUser(context.db, {
      username: "ada",
      password: "correct-horse",
    });
    const token = generateSessionToken();
    const tokenHash = hashSessionToken(token);

    await createSessionRecord(context.db, {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
    });
    await revokeSession(context.db, tokenHash);

    await expect(findActiveSession(context.db, tokenHash)).resolves.toBeNull();
  });

  it("does not resolve expired sessions", async () => {
    const user = await registerUser(context.db, {
      username: "ada",
      password: "correct-horse",
    });
    const token = generateSessionToken();
    const tokenHash = hashSessionToken(token);

    await createSessionRecord(context.db, {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(findActiveSession(context.db, tokenHash)).resolves.toBeNull();
  });

  it("stores only the token hash", async () => {
    const user = await registerUser(context.db, {
      username: "ada",
      password: "correct-horse",
    });
    const token = generateSessionToken();
    const tokenHash = hashSessionToken(token);

    await createSessionRecord(context.db, {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
    });

    const rows = await context.db.query.sessions.findMany();

    expect(rows).toHaveLength(1);
    expect(rows[0]?.tokenHash).toBe(tokenHash);
    expect(rows[0]?.tokenHash).not.toBe(token);
  });

  it("updates lastUsedAt when a session is touched", async () => {
    const user = await registerUser(context.db, {
      username: "ada",
      password: "correct-horse",
    });
    const token = generateSessionToken();
    const tokenHash = hashSessionToken(token);

    await createSessionRecord(context.db, {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
    });

    const before = await findActiveSession(context.db, tokenHash);
    await touchSession(context.db, before!.sessionId);
    const after = await findActiveSession(context.db, tokenHash);

    expect(after!.lastUsedAt.getTime()).toBeGreaterThanOrEqual(
      before!.lastUsedAt.getTime(),
    );
  });

  it("surfaces duplicate usernames as a structured AppError", async () => {
    await registerUser(context.db, { username: "ada", password: "first-password" });

    await expect(
      registerUser(context.db, { username: "ada", password: "second-password" }),
    ).rejects.toBeInstanceOf(AppError);
  });
});
