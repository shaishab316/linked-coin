import { and, eq, gt, isNull } from "drizzle-orm";

import type { Database } from "@/db";
import { sessions, users } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { AppError, isUniqueViolation } from "@/lib/errors/app-error";

import type { SignInInput, SignUpInput } from "./validation";

export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export type AuthUser = {
  id: string;
  username: string;
};

export type AuthenticatedSession = {
  user: AuthUser;
  sessionId: string;
  lastUsedAt: Date;
};

export async function registerUser(
  db: Database,
  input: SignUpInput,
): Promise<AuthUser> {
  const passwordHash = await hashPassword(input.password);

  try {
    const [user] = await db
      .insert(users)
      .values({ username: input.username, passwordHash })
      .returning({ id: users.id, username: users.username });

    if (!user) {
      throw new AppError("INTERNAL", "Could not create the account");
    }

    return user;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError("USERNAME_TAKEN", "That username is already taken", {
        fieldErrors: { username: ["That username is already taken"] },
      });
    }

    throw error;
  }
}

/** Returns null for both unknown users and wrong passwords. */
export async function authenticateUser(
  db: Database,
  input: SignInInput,
): Promise<AuthUser | null> {
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.username, input.username))
    .limit(1);

  if (!user) {
    return null;
  }

  const passwordMatches = await verifyPassword(user.passwordHash, input.password);

  return passwordMatches ? { id: user.id, username: user.username } : null;
}

export async function createSessionRecord(
  db: Database,
  input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    userAgent?: string | null;
  },
): Promise<void> {
  await db.insert(sessions).values({
    userId: input.userId,
    tokenHash: input.tokenHash,
    expiresAt: input.expiresAt,
    userAgent: input.userAgent ?? null,
  });
}

/**
 * Resolves an unexpired, unrevoked session together with its owner. Expired
 * and revoked sessions are excluded in the query itself.
 */
export async function findActiveSession(
  db: Database,
  tokenHash: string,
): Promise<AuthenticatedSession | null> {
  const [row] = await db
    .select({
      sessionId: sessions.id,
      lastUsedAt: sessions.lastUsedAt,
      userId: users.id,
      username: users.username,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!row) {
    return null;
  }

  return {
    sessionId: row.sessionId,
    lastUsedAt: row.lastUsedAt,
    user: { id: row.userId, username: row.username },
  };
}

export async function touchSession(
  db: Database,
  sessionId: string,
): Promise<void> {
  await db
    .update(sessions)
    .set({ lastUsedAt: new Date() })
    .where(eq(sessions.id, sessionId));
}

export async function revokeSession(
  db: Database,
  tokenHash: string,
): Promise<void> {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt)));
}
