import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { getDb } from "@/db";
import { getServerEnv } from "@/lib/config/env";
import { generateSessionToken, hashSessionToken } from "@/lib/auth/session-token";

import {
  createSessionRecord,
  findActiveSession,
  SESSION_DURATION_MS,
  revokeSession,
  touchSession,
  type AuthUser,
} from "./service";

export const SESSION_COOKIE_NAME = "linked_coin_session";

const TOUCH_INTERVAL_MS = 60 * 60 * 1000;

/** Creates a server-side session and sets the browser cookie. */
export async function startSession(userId: string): Promise<void> {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const requestHeaders = await headers();
  const userAgent = requestHeaders.get("user-agent");

  await createSessionRecord(getDb(), {
    userId,
    tokenHash,
    expiresAt,
    userAgent,
  });

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: getServerEnv().NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

async function loadCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const db = getDb();
  const session = await findActiveSession(db, hashSessionToken(token));

  if (!session) {
    return null;
  }

  if (Date.now() - session.lastUsedAt.getTime() > TOUCH_INTERVAL_MS) {
    await touchSession(db, session.sessionId);
  }

  return session.user;
}

/** Deduplicated per request by React.cache. */
export const getCurrentUser = cache(loadCurrentUser);

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return user;
}

export async function endSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await revokeSession(getDb(), hashSessionToken(token));
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}
