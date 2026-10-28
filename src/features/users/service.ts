import { eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { users } from "../../db/schema";
import { isValidTimezone, DEFAULT_APP_TIMEZONE } from "../../lib/date/timezone";
import { AppError } from "../../lib/errors/app-error";

let userColumnsEnsured = false;

export async function ensureUserColumns() {
  if (userColumnsEnsured) return;
  try {
    await db.execute(sql`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "name" text;
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "timezone" text NOT NULL DEFAULT 'Asia/Dhaka';
    `);
    userColumnsEnsured = true;
  } catch (err) {
    console.warn("ensureUserColumns warning:", err);
  }
}

export interface UserProfile {
  id: string;
  username: string;
  name: string | null;
  timezone: string;
  createdAt: Date;
}

export async function getUserProfile(userId: string): Promise<UserProfile> {
  await ensureUserColumns();

  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      timezone: users.timezone,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw AppError.notFound("User not found");
  }

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    timezone: user.timezone || DEFAULT_APP_TIMEZONE,
    createdAt: user.createdAt,
  };
}

export interface UpdateUserProfileInput {
  name?: string | null;
  timezone?: string;
}

export async function updateUserProfile(
  userId: string,
  input: UpdateUserProfileInput,
): Promise<UserProfile> {
  await ensureUserColumns();

  const updates: Partial<{ name: string | null; timezone: string; updatedAt: Date }> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) {
    updates.name = input.name?.trim() ? input.name.trim() : null;
  }

  if (input.timezone !== undefined) {
    const tz = input.timezone.trim();
    if (!isValidTimezone(tz)) {
      throw AppError.badRequest(`Invalid timezone: ${tz}`);
    }
    updates.timezone = tz;
  }

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      username: users.username,
      name: users.name,
      timezone: users.timezone,
      createdAt: users.createdAt,
    });

  if (!updated) {
    throw AppError.notFound("User not found");
  }

  return {
    id: updated.id,
    username: updated.username,
    name: updated.name,
    timezone: updated.timezone || DEFAULT_APP_TIMEZONE,
    createdAt: updated.createdAt,
  };
}
