import { eq, and, sql, desc, inArray, isNull } from "drizzle-orm";
import { db } from "../../db";
import {
  ledgerTransactions,
  ledgerEntries,
  transactionTags,
  transactionLinks,
  financialEvents,
  accounts,
  people,
  tags,
  type LedgerTransaction,
  type LedgerEntry,
  type Tag,
} from "../../db/schema";
import { AppError } from "../../lib/errors/app-error";
import { decimalStringToMinor, validateDoubleEntryBalance } from "../../lib/money/money";
import {
  createTransactionSchema,
  reverseTransactionSchema,
  type CreateTransactionInput,
  type ReverseTransactionInput,
} from "./validation";

export interface TransactionDetail extends LedgerTransaction {
  entries: LedgerEntry[];
  tags: Tag[];
  addons?: Array<LedgerTransaction>;
  linkedTransactions?: Array<{
    id: string;
    description: string;
    amountMinor: bigint;
    currency: string;
    linkType: string;
  }>;
}

export async function createTransaction(
  userId: string,
  input: CreateTransactionInput,
): Promise<TransactionDetail> {
  const parsed = createTransactionSchema.parse(input);
  const amountMinor = decimalStringToMinor(parsed.amount, parsed.currency);

  if (amountMinor <= 0n) {
    throw AppError.validation("Transaction amount must be strictly greater than zero");
  }

  // Idempotency check: if transaction with (userId, idempotencyKey) already exists, return it
  const [existing] = await db
    .select()
    .from(ledgerTransactions)
    .where(
      and(
        eq(ledgerTransactions.userId, userId),
        eq(ledgerTransactions.idempotencyKey, parsed.idempotencyKey),
      ),
    )
    .limit(1);

  if (existing) {
    return await getTransactionById(userId, existing.id);
  }

  // Validate ownership of accounts
  if (parsed.sourceAccountId) {
    const [acc] = await db
      .select({ id: accounts.id, currency: accounts.currency })
      .from(accounts)
      .where(and(eq(accounts.id, parsed.sourceAccountId), eq(accounts.userId, userId)))
      .limit(1);
    if (!acc) throw AppError.notFound("Source account not found");
    if (acc.currency !== parsed.currency) {
      throw AppError.validation(
        `Source account currency (${acc.currency}) does not match transaction currency (${parsed.currency})`,
      );
    }
  }

  if (parsed.destinationAccountId) {
    const [acc] = await db
      .select({ id: accounts.id, currency: accounts.currency })
      .from(accounts)
      .where(and(eq(accounts.id, parsed.destinationAccountId), eq(accounts.userId, userId)))
      .limit(1);
    if (!acc) throw AppError.notFound("Destination account not found");
    if (acc.currency !== parsed.currency) {
      throw AppError.validation(
        `Destination account currency (${acc.currency}) does not match transaction currency (${parsed.currency})`,
      );
    }
  }

  // Validate person ownership
  if (parsed.personId) {
    const [p] = await db
      .select({ id: people.id })
      .from(people)
      .where(and(eq(people.id, parsed.personId), eq(people.userId, userId)))
      .limit(1);
    if (!p) throw AppError.notFound("Person not found");
  }

  // Validate linked loan debt if repaying a specific loan
  if (parsed.linkedTransactionId) {
    const [linkedTx] = await db
      .select()
      .from(ledgerTransactions)
      .where(
        and(
          eq(ledgerTransactions.id, parsed.linkedTransactionId),
          eq(ledgerTransactions.userId, userId),
        ),
      )
      .limit(1);

    if (!linkedTx) throw AppError.notFound("Linked transaction not found");

    if (parsed.type === "repayment_received" || parsed.type === "repayment_made") {
      const outstanding = await getOutstandingLoanBalance(userId, parsed.linkedTransactionId);
      if (amountMinor > outstanding) {
        throw AppError.validation(
          `Repayment amount (${amountMinor}) exceeds outstanding balance (${outstanding}) of the linked loan`,
        );
      }
    }
  }

  // Construct balanced double-entry legs
  const entryDrafts: Array<{
    accountId?: string | null;
    personId?: string | null;
    externalKind?: "income" | "expense" | "equity" | null;
    direction: "debit" | "credit";
    amountMinor: bigint;
    currency: string;
  }> = [];

  switch (parsed.type) {
    case "expense":
      entryDrafts.push(
        {
          accountId: parsed.sourceAccountId!,
          direction: "credit",
          amountMinor,
          currency: parsed.currency,
        },
        {
          externalKind: "expense",
          direction: "debit",
          amountMinor,
          currency: parsed.currency,
        },
      );
      break;

    case "income":
      entryDrafts.push(
        {
          accountId: parsed.destinationAccountId!,
          direction: "debit",
          amountMinor,
          currency: parsed.currency,
        },
        {
          externalKind: "income",
          direction: "credit",
          amountMinor,
          currency: parsed.currency,
        },
      );
      break;

    case "transfer":
      entryDrafts.push(
        {
          accountId: parsed.sourceAccountId!,
          direction: "credit",
          amountMinor,
          currency: parsed.currency,
        },
        {
          accountId: parsed.destinationAccountId!,
          direction: "debit",
          amountMinor,
          currency: parsed.currency,
        },
      );
      break;

    case "loan_given":
      entryDrafts.push(
        {
          accountId: parsed.sourceAccountId!,
          direction: "credit",
          amountMinor,
          currency: parsed.currency,
        },
        {
          personId: parsed.personId!,
          direction: "debit",
          amountMinor,
          currency: parsed.currency,
        },
      );
      break;

    case "loan_received":
      entryDrafts.push(
        {
          accountId: parsed.destinationAccountId!,
          direction: "debit",
          amountMinor,
          currency: parsed.currency,
        },
        {
          personId: parsed.personId!,
          direction: "credit",
          amountMinor,
          currency: parsed.currency,
        },
      );
      break;

    case "repayment_received":
      entryDrafts.push(
        {
          accountId: parsed.destinationAccountId!,
          direction: "debit",
          amountMinor,
          currency: parsed.currency,
        },
        {
          personId: parsed.personId!,
          direction: "credit",
          amountMinor,
          currency: parsed.currency,
        },
      );
      break;

    case "repayment_made":
      entryDrafts.push(
        {
          accountId: parsed.sourceAccountId!,
          direction: "credit",
          amountMinor,
          currency: parsed.currency,
        },
        {
          personId: parsed.personId!,
          direction: "debit",
          amountMinor,
          currency: parsed.currency,
        },
      );
      break;

    case "adjustment":
      entryDrafts.push(
        {
          accountId: (parsed.destinationAccountId || parsed.sourceAccountId)!,
          direction: "debit",
          amountMinor,
          currency: parsed.currency,
        },
        {
          externalKind: "equity",
          direction: "credit",
          amountMinor,
          currency: parsed.currency,
        },
      );
      break;

    default:
      throw AppError.validation(`Unsupported transaction type: ${parsed.type}`);
  }

  // Pre-validate balancing invariant
  validateDoubleEntryBalance(
    entryDrafts.map((e) => ({
      direction: e.direction === "debit" ? "DEBIT" : "CREDIT",
      amountMinor: e.amountMinor,
      currency: e.currency,
    })),
  );

  const occurredAt = new Date(parsed.occurredAt);

  return await db.transaction(async (tx) => {
    // 1. Insert transaction
    const [createdTx] = await tx
      .insert(ledgerTransactions)
      .values({
        userId,
        type: parsed.type,
        occurredAt,
        description: parsed.description,
        notes: parsed.notes || null,
        currency: parsed.currency,
        amountMinor,
        personId: parsed.personId || null,
        idempotencyKey: parsed.idempotencyKey,
      })
      .returning();

    // 2. Insert entries
    const entriesToInsert = entryDrafts.map((e) => ({
      transactionId: createdTx.id,
      userId,
      accountId: e.accountId || null,
      personId: e.personId || null,
      externalKind: e.externalKind || null,
      direction: e.direction,
      amountMinor: e.amountMinor,
      currency: e.currency,
    }));

    const insertedEntries = await tx.insert(ledgerEntries).values(entriesToInsert).returning();

    // 3. Associate tags
    if (parsed.tagIds && parsed.tagIds.length > 0) {
      // Validate tag ownership
      const userTags = await tx
        .select({ id: tags.id })
        .from(tags)
        .where(and(eq(tags.userId, userId), inArray(tags.id, parsed.tagIds)));

      if (userTags.length > 0) {
        await tx.insert(transactionTags).values(
          userTags.map((t) => ({
            transactionId: createdTx.id,
            tagId: t.id,
          })),
        );
      }
    }

    // 4. Link transactions if applicable
    if (parsed.linkedTransactionId) {
      await tx.insert(transactionLinks).values({
        userId,
        fromTransactionId: createdTx.id,
        toTransactionId: parsed.linkedTransactionId,
        linkType:
          parsed.type === "repayment_received" || parsed.type === "repayment_made"
            ? "repayment"
            : "correction",
      });
    }

    // 4.1 Process addon transactions if any
    const createdAddons: LedgerTransaction[] = [];
    if (parsed.addons && parsed.addons.length > 0) {
      let addonIndex = 0;
      for (const addon of parsed.addons) {
        addonIndex++;
        const addonAmountMinor = decimalStringToMinor(addon.amount, parsed.currency);
        if (addonAmountMinor <= 0n) continue;

        const addonType = addon.type || "expense";
        const addonSourceAccountId = addon.sourceAccountId || parsed.sourceAccountId || null;
        const addonDestinationAccountId = addon.destinationAccountId || parsed.destinationAccountId || null;

        const addonLegs: Array<{
          accountId?: string | null;
          personId?: string | null;
          externalKind?: "income" | "expense" | "equity" | null;
          direction: "debit" | "credit";
          amountMinor: bigint;
          currency: string;
        }> = [];

        if (addonType === "expense") {
          if (addonSourceAccountId) {
            addonLegs.push({
              accountId: addonSourceAccountId,
              direction: "credit",
              amountMinor: addonAmountMinor,
              currency: parsed.currency,
            });
          }
          addonLegs.push({
            externalKind: "expense",
            direction: "debit",
            amountMinor: addonAmountMinor,
            currency: parsed.currency,
          });
        } else if (addonType === "income") {
          if (addonDestinationAccountId) {
            addonLegs.push({
              accountId: addonDestinationAccountId,
              direction: "debit",
              amountMinor: addonAmountMinor,
              currency: parsed.currency,
            });
          }
          addonLegs.push({
            externalKind: "income",
            direction: "credit",
            amountMinor: addonAmountMinor,
            currency: parsed.currency,
          });
        }

        validateDoubleEntryBalance(
          addonLegs.map((e) => ({
            direction: e.direction === "debit" ? "DEBIT" : "CREDIT",
            amountMinor: e.amountMinor,
            currency: e.currency,
          })),
        );

        const [addonTx] = await tx
          .insert(ledgerTransactions)
          .values({
            userId,
            type: addonType,
            occurredAt,
            description: addon.description,
            notes: addon.notes || `Add-on to: ${parsed.description}`,
            currency: parsed.currency,
            amountMinor: addonAmountMinor,
            personId: parsed.personId || null,
            idempotencyKey: `${parsed.idempotencyKey}_addon_${addonIndex}_${crypto.randomUUID()}`,
          })
          .returning();

        await tx.insert(ledgerEntries).values(
          addonLegs.map((e) => ({
            transactionId: addonTx.id,
            userId,
            accountId: e.accountId || null,
            personId: e.personId || null,
            externalKind: e.externalKind || null,
            direction: e.direction,
            amountMinor: e.amountMinor,
            currency: e.currency,
          })),
        );

        if (addon.tagIds && addon.tagIds.length > 0) {
          const addonUserTags = await tx
            .select({ id: tags.id })
            .from(tags)
            .where(and(eq(tags.userId, userId), inArray(tags.id, addon.tagIds)));

          if (addonUserTags.length > 0) {
            await tx.insert(transactionTags).values(
              addonUserTags.map((t) => ({
                transactionId: addonTx.id,
                tagId: t.id,
              })),
            );
          }
        }

        // Link addon to parent transaction
        await tx.insert(transactionLinks).values({
          userId,
          fromTransactionId: addonTx.id,
          toTransactionId: createdTx.id,
          linkType: "addon",
        });

        // Financial event for addon
        await tx.insert(financialEvents).values({
          userId,
          transactionId: addonTx.id,
          eventType: "TRANSACTION_CREATED",
          payload: {
            transactionId: addonTx.id,
            parentTransactionId: createdTx.id,
            type: addonType,
            amountMinor: addonAmountMinor.toString(),
            currency: parsed.currency,
            description: addon.description,
            occurredAt: occurredAt.toISOString(),
            isAddon: true,
          },
          occurredAt,
          idempotencyKey: addonTx.idempotencyKey,
        });

        createdAddons.push(addonTx);
      }
    }

    // 5. Append immutable financial event
    await tx.insert(financialEvents).values({
      userId,
      transactionId: createdTx.id,
      eventType: "TRANSACTION_CREATED",
      payload: {
        transactionId: createdTx.id,
        type: parsed.type,
        amountMinor: amountMinor.toString(),
        currency: parsed.currency,
        description: parsed.description,
        occurredAt: occurredAt.toISOString(),
      },
      occurredAt,
      idempotencyKey: parsed.idempotencyKey,
    });

    const assignedTags =
      parsed.tagIds && parsed.tagIds.length > 0
        ? await tx.select().from(tags).where(inArray(tags.id, parsed.tagIds))
        : [];

    return {
      ...createdTx,
      entries: insertedEntries,
      tags: assignedTags,
      addons: createdAddons,
    };
  });
}

export async function reverseTransaction(
  userId: string,
  transactionId: string,
  input: ReverseTransactionInput,
): Promise<TransactionDetail> {
  const parsed = reverseTransactionSchema.parse(input);

  return await db.transaction(async (tx) => {
    // 1. Fetch original transaction
    const [original] = await tx
      .select()
      .from(ledgerTransactions)
      .where(and(eq(ledgerTransactions.id, transactionId), eq(ledgerTransactions.userId, userId)))
      .limit(1);

    if (!original) {
      throw AppError.notFound("Transaction not found");
    }

    if (original.type === "reversal") {
      throw AppError.validation("A reversal transaction cannot be reversed");
    }

    if (original.reversedAt) {
      throw AppError.conflict("This transaction has already been reversed");
    }

    // 2. Fetch original entries
    const origEntries = await tx
      .select()
      .from(ledgerEntries)
      .where(and(eq(ledgerEntries.transactionId, transactionId), eq(ledgerEntries.userId, userId)));

    const now = new Date();

    // 3. Create compensating transaction
    const [reversalTx] = await tx
      .insert(ledgerTransactions)
      .values({
        userId,
        type: "reversal",
        occurredAt: now,
        description: `Reversal of "${original.description}": ${parsed.reason}`,
        notes: parsed.reason,
        currency: original.currency,
        amountMinor: original.amountMinor,
        personId: original.personId,
        reversesTransactionId: original.id,
        idempotencyKey: parsed.idempotencyKey,
      })
      .returning();

    // 4. Create inverse entries: debit becomes credit, credit becomes debit
    const inverseEntries = origEntries.map((e) => ({
      transactionId: reversalTx.id,
      userId,
      accountId: e.accountId,
      personId: e.personId,
      externalKind: e.externalKind as any,
      direction: e.direction === "debit" ? ("credit" as const) : ("debit" as const),
      amountMinor: e.amountMinor,
      currency: e.currency,
    }));

    const insertedEntries = await tx.insert(ledgerEntries).values(inverseEntries).returning();

    // 5. Mark original transaction reversed
    await tx
      .update(ledgerTransactions)
      .set({
        reversedByTransactionId: reversalTx.id,
        reversedAt: now,
      })
      .where(eq(ledgerTransactions.id, original.id));

    // 6. Link reversal to original
    await tx.insert(transactionLinks).values({
      userId,
      fromTransactionId: reversalTx.id,
      toTransactionId: original.id,
      linkType: "reversal",
    });

    // 7. Append immutable financial event
    await tx.insert(financialEvents).values({
      userId,
      transactionId: reversalTx.id,
      eventType: "TRANSACTION_REVERSED",
      payload: {
        reversalTransactionId: reversalTx.id,
        originalTransactionId: original.id,
        reason: parsed.reason,
        amountMinor: original.amountMinor.toString(),
        currency: original.currency,
      },
      occurredAt: now,
      idempotencyKey: parsed.idempotencyKey,
    });

    return {
      ...reversalTx,
      entries: insertedEntries,
      tags: [],
    };
  });
}

export async function getTransactionById(
  userId: string,
  transactionId: string,
): Promise<TransactionDetail> {
  const [transaction] = await db
    .select()
    .from(ledgerTransactions)
    .where(and(eq(ledgerTransactions.id, transactionId), eq(ledgerTransactions.userId, userId)))
    .limit(1);

  if (!transaction) {
    throw AppError.notFound("Transaction not found");
  }

  const entries = await db
    .select()
    .from(ledgerEntries)
    .where(and(eq(ledgerEntries.transactionId, transactionId), eq(ledgerEntries.userId, userId)));

  const tagRows = await db
    .select({ tag: tags })
    .from(transactionTags)
    .innerJoin(tags, eq(transactionTags.tagId, tags.id))
    .where(eq(transactionTags.transactionId, transactionId));

  const links = await db
    .select({
      id: ledgerTransactions.id,
      description: ledgerTransactions.description,
      amountMinor: ledgerTransactions.amountMinor,
      currency: ledgerTransactions.currency,
      linkType: transactionLinks.linkType,
    })
    .from(transactionLinks)
    .innerJoin(ledgerTransactions, eq(transactionLinks.toTransactionId, ledgerTransactions.id))
    .where(
      and(
        eq(transactionLinks.userId, userId),
        eq(transactionLinks.fromTransactionId, transactionId),
      ),
    );

  return {
    ...transaction,
    entries,
    tags: tagRows.map((r) => r.tag),
    linkedTransactions: links,
  };
}

export async function getOutstandingLoanBalance(
  userId: string,
  loanTransactionId: string,
): Promise<bigint> {
  const [loan] = await db
    .select()
    .from(ledgerTransactions)
    .where(and(eq(ledgerTransactions.id, loanTransactionId), eq(ledgerTransactions.userId, userId)))
    .limit(1);

  if (!loan) return 0n;

  // Sum linked repayments that are not reversed
  const [repayments] = await db
    .select({
      total: sql<string>`coalesce(sum(${ledgerTransactions.amountMinor}), 0)`,
    })
    .from(transactionLinks)
    .innerJoin(ledgerTransactions, eq(transactionLinks.fromTransactionId, ledgerTransactions.id))
    .where(
      and(
        eq(transactionLinks.toTransactionId, loanTransactionId),
        eq(transactionLinks.linkType, "repayment"),
        isNull(ledgerTransactions.reversedAt),
      ),
    );

  const repaidMinor = BigInt(repayments?.total || "0");
  const remaining = loan.amountMinor - repaidMinor;
  return remaining > 0n ? remaining : 0n;
}
