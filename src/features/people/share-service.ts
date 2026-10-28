import crypto from "crypto";
import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../../db";
import { sharedPersonLinks, users, type SharedPersonLink } from "../../db/schema";
import { getPersonById, type PersonWithBalance } from "./service";
import { searchTransactions } from "../query-builder/service";
import { AppError } from "../../lib/errors/app-error";

let tableEnsured = false;
export async function ensureSharedLinksTable() {
  if (tableEnsured) return;
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "shared_person_links" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "person_id" uuid NOT NULL REFERENCES "people"("id") ON DELETE CASCADE,
        "token" text NOT NULL,
        "label" text,
        "expires_at" timestamp with time zone,
        "revoked_at" timestamp with time zone,
        "access_count" integer DEFAULT 0 NOT NULL,
        "last_accessed_at" timestamp with time zone,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "shared_person_links_token_unique" ON "shared_person_links" ("token");
      CREATE INDEX IF NOT EXISTS "shared_person_links_user_person_idx" ON "shared_person_links" ("user_id", "person_id");
      CREATE INDEX IF NOT EXISTS "shared_person_links_person_id_idx" ON "shared_person_links" ("person_id");
    `);
    tableEnsured = true;
  } catch (err) {
    console.warn("ensureSharedLinksTable warning:", err);
  }
}

export interface CreateShareLinkInput {
  personId: string;
  expiresInDays?: number | null; // null or <= 0 means unlimited
  label?: string;
}

export async function createShareLink(
  userId: string,
  input: CreateShareLinkInput,
): Promise<SharedPersonLink> {
  await ensureSharedLinksTable();

  // Verify person exists and belongs to user
  await getPersonById(userId, input.personId);

  // Generate 256-bit secure URL-safe random token
  const tokenBytes = crypto.randomBytes(32);
  const token = `spl_${tokenBytes.toString("base64url")}`;

  let expiresAt: Date | null = null;
  if (input.expiresInDays && input.expiresInDays > 0) {
    expiresAt = new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000);
  }

  const [link] = await db
    .insert(sharedPersonLinks)
    .values({
      userId,
      personId: input.personId,
      token,
      label: input.label?.trim() || null,
      expiresAt,
    })
    .returning();

  return link;
}

export async function listShareLinksForPerson(
  userId: string,
  personId: string,
): Promise<SharedPersonLink[]> {
  await ensureSharedLinksTable();

  return await db
    .select()
    .from(sharedPersonLinks)
    .where(and(eq(sharedPersonLinks.userId, userId), eq(sharedPersonLinks.personId, personId)))
    .orderBy(desc(sharedPersonLinks.createdAt));
}

export async function revokeShareLink(
  userId: string,
  linkId: string,
): Promise<SharedPersonLink> {
  await ensureSharedLinksTable();

  const [revoked] = await db
    .update(sharedPersonLinks)
    .set({
      revokedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(sharedPersonLinks.id, linkId), eq(sharedPersonLinks.userId, userId)))
    .returning();

  if (!revoked) {
    throw AppError.notFound("Share link not found");
  }

  return revoked;
}

export interface ResolvedSharedPerson {
  valid: boolean;
  reason?: "invalid" | "expired" | "revoked";
  person?: PersonWithBalance;
  owner?: { username: string; name?: string | null };
  link?: SharedPersonLink;
}

export async function resolveSharedPerson(token: string): Promise<ResolvedSharedPerson> {
  await ensureSharedLinksTable();

  const [link] = await db
    .select()
    .from(sharedPersonLinks)
    .where(eq(sharedPersonLinks.token, token))
    .limit(1);

  if (!link) {
    return { valid: false, reason: "invalid" };
  }

  if (link.revokedAt) {
    return { valid: false, reason: "revoked", link };
  }

  if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) {
    return { valid: false, reason: "expired", link };
  }

  // Update access stats asynchronously
  db.update(sharedPersonLinks)
    .set({
      accessCount: link.accessCount + 1,
      lastAccessedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(sharedPersonLinks.id, link.id))
    .catch((err) => console.error("Failed to update share link access stats:", err));

  // Fetch person balance
  const person = await getPersonById(link.userId, link.personId);

  // Fetch owner username and display name
  const [owner] = await db
    .select({ username: users.username, name: users.name })
    .from(users)
    .where(eq(users.id, link.userId))
    .limit(1);

  return {
    valid: true,
    person,
    owner: owner || { username: "Account Owner", name: null },
    link,
  };
}

export interface SharedTransactionItem {
  id: string;
  type: string;
  amountMinor: bigint;
  currency: string;
  description: string;
  notes: string | null;
  occurredAt: string;
  reversedAt: string | null;
  parentTransactionId: string | null;
  isAddon: boolean;
  addons?: Array<{
    id: string;
    type: string;
    amountMinor: bigint;
    currency: string;
    description: string;
    occurredAt: string;
  }>;
  personName: string;
  tags: Array<{ id: string; name: string }>;
  entries: Array<{
    id: string;
    direction: string;
    amountMinor: bigint;
    currency: string;
    externalKind?: string;
  }>;
}

export async function getSharedPersonTransactions(
  userId: string,
  personId: string,
  personName: string,
  options?: {
    search?: string;
    sortField?: "occurredAt" | "amount";
    sortDirection?: "asc" | "desc";
    type?: string;
  },
): Promise<SharedTransactionItem[]> {
  const ast: any = {
    personIds: [personId],
    limit: 100,
    offset: 0,
    sort: {
      field: options?.sortField || "occurredAt",
      direction: options?.sortDirection || "desc",
    },
  };

  if (options?.search?.trim()) {
    ast.text = options.search.trim();
  }

  if (options?.type && options.type !== "all") {
    ast.transactionTypes = [options.type];
  }

  const result = await searchTransactions(userId, ast);

  return result.items.map((tx) => ({
    id: tx.id,
    type: tx.type,
    amountMinor: tx.amountMinor,
    currency: tx.currency,
    description: tx.description,
    notes: tx.notes,
    occurredAt: tx.occurredAt.toISOString(),
    reversedAt: tx.reversedAt?.toISOString() || null,
    parentTransactionId: tx.parentTransactionId || null,
    isAddon: !!tx.parentTransactionId,
    addons: tx.addonTransactions?.map((a) => ({
      id: a.id,
      type: a.type,
      amountMinor: a.amountMinor,
      currency: a.currency,
      description: a.description,
      occurredAt: a.occurredAt.toISOString(),
    })),
    personName,
    tags: tx.tags.map((t) => ({ id: t.id, name: t.name })),
    entries: tx.entries.map((e) => ({
      id: e.id,
      direction: e.direction,
      amountMinor: e.amountMinor,
      currency: e.currency,
      externalKind: e.externalKind || undefined,
    })),
  }));
}
