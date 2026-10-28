import { eq } from "drizzle-orm";
import { db } from "../../db";
import { users, accounts } from "../../db/schema";
import { hashPassword, verifyPassword } from "../../lib/auth/password";
import { AppError } from "../../lib/errors/app-error";
import { createSession, getSessionUser, revokeCurrentSession } from "./session";
import { signUpSchema, signInSchema, type SignUpInput, type SignInInput } from "./validation";
import { DEFAULT_CURRENCY } from "../../lib/money/money";

export async function signUp(input: SignUpInput, userAgent?: string) {
  await ensureUserColumns();
  const parsed = signUpSchema.parse(input);

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, parsed.username))
    .limit(1);

  if (existing.length > 0) {
    throw AppError.conflict("Username is already taken");
  }

  const passwordHash = await hashPassword(parsed.password);

  const [newUser] = await db
    .insert(users)
    .values({
      username: parsed.username,
      passwordHash,
    })
    .returning();

  // Seed default primary account for fresh user
  await db.insert(accounts).values({
    userId: newUser.id,
    name: "Cash Wallet",
    accountType: "cash",
    currency: DEFAULT_CURRENCY,
    description: "Primary physical cash wallet",
  });

  const sessionToken = await createSession(newUser.id, userAgent);
  return { user: newUser, sessionToken };
}

export async function signIn(input: SignInInput, userAgent?: string) {
  const parsed = signInSchema.parse(input);

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, parsed.username))
    .limit(1);

  if (!user) {
    throw AppError.unauthorized("Invalid username or password");
  }

  const isValid = await verifyPassword(parsed.password, user.passwordHash);
  if (!isValid) {
    throw AppError.unauthorized("Invalid username or password");
  }

  const sessionToken = await createSession(user.id, userAgent);
  return { user, sessionToken };
}

export async function signOut() {
  await revokeCurrentSession();
}

import { redirect } from "next/navigation";
import { ensureUserColumns } from "../users/service";

export async function requireUser() {
  await ensureUserColumns();
  const user = await getSessionUser();
  if (!user) {
    redirect("/sign-in");
  }
  return user;
}
