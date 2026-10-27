import { cookies } from "next/headers";
import { eq, and, gt, isNull } from "drizzle-orm";
import { db } from "../../db";
import { sessions, users, type User } from "../../db/schema";
import { generateSessionToken, hashSessionToken } from "../../lib/auth/session-token";

export const SESSION_COOKIE_NAME = "linked_coin_session";
const SESSION_MAX_AGE_DAYS = 30;

export async function createSession(userId: string, userAgent?: string): Promise<string> {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({
    userId,
    tokenHash,
    expiresAt,
    userAgent: userAgent || null,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return token;
}

export async function validateSessionToken(token: string): Promise<User | null> {
  const tokenHash = hashSessionToken(token);
  const now = new Date();

  const [record] = await db
    .select({
      user: users,
      session: sessions,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        gt(sessions.expiresAt, now),
        isNull(sessions.revokedAt),
      ),
    )
    .limit(1);

  if (!record) {
    return null;
  }

  // Update lastUsedAt asynchronously
  db.update(sessions)
    .set({ lastUsedAt: now })
    .where(eq(sessions.id, record.session.id))
    .catch(() => {});

  return record.user;
}

export async function getSessionUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return validateSessionToken(token);
}

export async function revokeCurrentSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    const tokenHash = hashSessionToken(token);
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.tokenHash, tokenHash));
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}
