import { eq, and, gte, lte, inArray, ilike, sql, desc, asc, isNull, isNotNull, or, type SQL } from "drizzle-orm";
import { db } from "../../db";
import {
  ledgerTransactions,
  ledgerEntries,
  transactionTags,
  transactionLinks,
  tags,
  type LedgerTransaction,
  type Tag,
  type LedgerEntry,
} from "../../db/schema";
import { decimalStringToMinor, DEFAULT_CURRENCY } from "../../lib/money/money";
import type { ValidatedQueryAst } from "./validation";

export interface QueryResultItem extends LedgerTransaction {
  entries: LedgerEntry[];
  tags: Tag[];
  parentTransactionId?: string | null;
  addonTransactions?: Array<{
    id: string;
    description: string;
    amountMinor: bigint;
    currency: string;
    type: string;
    occurredAt: Date;
  }>;
}

export interface PaginatedQueryResult {
  items: QueryResultItem[];
  totalCount: number;
  hasMore: boolean;
  nextOffset: number;
}

export async function executeTransactionQuery(
  userId: string,
  ast: ValidatedQueryAst,
): Promise<PaginatedQueryResult> {
  const conditions: SQL[] = [eq(ledgerTransactions.userId, userId)];

  // Date filtering
  if (ast.date?.from) {
    conditions.push(gte(ledgerTransactions.occurredAt, new Date(ast.date.from)));
  }
  if (ast.date?.to) {
    conditions.push(lte(ledgerTransactions.occurredAt, new Date(ast.date.to)));
  }

  // Type filtering
  if (ast.transactionTypes && ast.transactionTypes.length > 0) {
    conditions.push(inArray(ledgerTransactions.type, ast.transactionTypes));
  }

  // Currency
  if (ast.currency) {
    conditions.push(eq(ledgerTransactions.currency, ast.currency));
  }

  // Person
  if (ast.personIds && ast.personIds.length > 0) {
    conditions.push(inArray(ledgerTransactions.personId, ast.personIds));
  }

  // Amount filtering
  const currencyForScale = ast.currency || DEFAULT_CURRENCY;
  if (ast.amount?.min) {
    const minMinor = decimalStringToMinor(ast.amount.min, currencyForScale);
    conditions.push(gte(ledgerTransactions.amountMinor, minMinor));
  }
  if (ast.amount?.max) {
    const maxMinor = decimalStringToMinor(ast.amount.max, currencyForScale);
    conditions.push(lte(ledgerTransactions.amountMinor, maxMinor));
  }

  // Reversal status
  if (ast.isReversed !== undefined) {
    if (ast.isReversed) {
      conditions.push(isNotNull(ledgerTransactions.reversedAt));
    } else {
      conditions.push(isNull(ledgerTransactions.reversedAt));
    }
  }

  // Text search
  if (ast.text && ast.text.trim()) {
    conditions.push(ilike(ledgerTransactions.description, `%${ast.text.trim()}%`));
  }

  // Account filtering (subquery)
  if (ast.accountIds && ast.accountIds.length > 0) {
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM ${ledgerEntries}
        WHERE ${ledgerEntries.transactionId} = ${ledgerTransactions.id}
          AND ${inArray(ledgerEntries.accountId, ast.accountIds)}
      )`,
    );
  }

  // Tag filtering (subquery)
  if (ast.tagIds && ast.tagIds.length > 0) {
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM ${transactionTags}
        WHERE ${transactionTags.transactionId} = ${ledgerTransactions.id}
          AND ${inArray(transactionTags.tagId, ast.tagIds)}
      )`,
    );
  }

  const whereClause = and(...conditions);

  // Get total count
  const [countRow] = await db
    .select({ count: sql<string>`count(*)` })
    .from(ledgerTransactions)
    .where(whereClause);

  const totalCount = parseInt(countRow?.count || "0", 10);

  // Sorting
  const sortDirection = ast.sort.direction === "asc" ? asc : desc;
  const sortCol =
    ast.sort.field === "amount" ? ledgerTransactions.amountMinor : ledgerTransactions.occurredAt;

  const limit = ast.limit || 50;
  const offset = ast.offset || 0;

  const rows = await db
    .select()
    .from(ledgerTransactions)
    .where(whereClause)
    .orderBy(sortDirection(sortCol), desc(ledgerTransactions.id))
    .limit(limit)
    .offset(offset);

  if (rows.length === 0) {
    return {
      items: [],
      totalCount,
      hasMore: false,
      nextOffset: offset,
    };
  }

  const txIds = rows.map((r) => r.id);

  // Batch load entries and tags
  const allEntries = await db
    .select()
    .from(ledgerEntries)
    .where(and(eq(ledgerEntries.userId, userId), inArray(ledgerEntries.transactionId, txIds)));

  const allTagRows = await db
    .select({
      transactionId: transactionTags.transactionId,
      tag: tags,
    })
    .from(transactionTags)
    .innerJoin(tags, eq(transactionTags.tagId, tags.id))
    .where(inArray(transactionTags.transactionId, txIds));

  const entriesByTx = new Map<string, LedgerEntry[]>();
  for (const entry of allEntries) {
    const list = entriesByTx.get(entry.transactionId) || [];
    list.push(entry);
    entriesByTx.set(entry.transactionId, list);
  }

  const tagsByTx = new Map<string, Tag[]>();
  for (const row of allTagRows) {
    const list = tagsByTx.get(row.transactionId) || [];
    list.push(row.tag);
    tagsByTx.set(row.transactionId, list);
  }

  // Batch load addon links safely (casting linkType to text to support both enum and text schemas)
  let addonLinks: Array<{ addonId: string; parentId: string }> = [];
  try {
    addonLinks = await db
      .select({
        addonId: transactionLinks.fromTransactionId,
        parentId: transactionLinks.toTransactionId,
      })
      .from(transactionLinks)
      .where(
        and(
          eq(transactionLinks.userId, userId),
          sql`${transactionLinks.linkType}::text = 'addon'`,
          or(
            inArray(transactionLinks.fromTransactionId, txIds),
            inArray(transactionLinks.toTransactionId, txIds),
          ),
        ),
      );
  } catch (linkErr) {
    console.warn("Could not query addon links (schema may be updating):", linkErr);
    addonLinks = [];
  }

  const parentByAddonId = new Map<string, string>();
  const addonIdsByParentId = new Map<string, string[]>();
  const externalAddonIdsToFetch: string[] = [];

  for (const link of addonLinks) {
    parentByAddonId.set(link.addonId, link.parentId);
    const list = addonIdsByParentId.get(link.parentId) || [];
    if (!list.includes(link.addonId)) {
      list.push(link.addonId);
      addonIdsByParentId.set(link.parentId, list);
    }

    if (!txIds.includes(link.addonId) && !externalAddonIdsToFetch.includes(link.addonId)) {
      externalAddonIdsToFetch.push(link.addonId);
    }
  }

  const externalAddonRows =
    externalAddonIdsToFetch.length > 0
      ? await db
          .select()
          .from(ledgerTransactions)
          .where(
            and(
              eq(ledgerTransactions.userId, userId),
              inArray(ledgerTransactions.id, externalAddonIdsToFetch),
            ),
          )
      : [];

  const allTxById = new Map<string, LedgerTransaction>();
  for (const r of rows) {
    allTxById.set(r.id, r);
  }
  for (const ext of externalAddonRows) {
    allTxById.set(ext.id, ext);
  }

  const items: QueryResultItem[] = rows.map((r) => {
    const parentId = parentByAddonId.get(r.id) || null;
    const addonIds = addonIdsByParentId.get(r.id) || [];
    const addonTransactions = addonIds
      .map((aid) => allTxById.get(aid))
      .filter(Boolean)
      .map((atx) => ({
        id: atx!.id,
        description: atx!.description,
        amountMinor: atx!.amountMinor,
        currency: atx!.currency,
        type: atx!.type,
        occurredAt: atx!.occurredAt,
      }));

    return {
      ...r,
      entries: entriesByTx.get(r.id) || [],
      tags: tagsByTx.get(r.id) || [],
      parentTransactionId: parentId,
      addonTransactions,
    };
  });

  const hasMore = offset + items.length < totalCount;
  const nextOffset = offset + items.length;

  return {
    items,
    totalCount,
    hasMore,
    nextOffset,
  };
}
