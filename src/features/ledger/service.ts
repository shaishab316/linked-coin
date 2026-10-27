import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import type { Database } from "@/db";
import {
  accounts,
  financialEvents,
  ledgerEntries,
  ledgerTransactions,
  people,
  tags,
  transactionLinks,
  transactionTags,
} from "@/db/schema";
import { AppError, isUniqueViolation } from "@/lib/errors/app-error";
import {
  formatMinor,
  parseAmountToMinor,
} from "@/lib/money/money";

import type { LedgerCommandInput, ReversalInput } from "./validation";

type TransactionContext = Parameters<Parameters<Database["transaction"]>[0]>[0];

type EntryTarget =
  | { accountId: string }
  | { personId: string }
  | { externalKind: "income" | "expense" | "equity" };

type PlannedEntry = EntryTarget & {
  direction: "debit" | "credit";
  amountMinor: bigint;
};

export type LedgerResult = {
  transactionId: string;
  idempotent: boolean;
};

/**
 * Builds the balanced entry plan for a command. Assets increase on debit and
 * decrease on credit; income and expense effects use nominal ledger targets,
 * so every command stays double-entry balanced.
 */
function planEntries(
  command: LedgerCommandInput,
  amountMinor: bigint,
): PlannedEntry[] {
  const debit = (target: EntryTarget): PlannedEntry => ({
    ...target,
    direction: "debit",
    amountMinor,
  });
  const credit = (target: EntryTarget): PlannedEntry => ({
    ...target,
    direction: "credit",
    amountMinor,
  });

  switch (command.type) {
    case "income":
      return [
        debit({ accountId: command.accountId }),
        credit({ externalKind: "income" }),
      ];
    case "expense":
      return [
        debit({ externalKind: "expense" }),
        credit({ accountId: command.accountId }),
      ];
    case "transfer":
      return [
        debit({ accountId: command.toAccountId }),
        credit({ accountId: command.fromAccountId }),
      ];
    case "loan_given":
      return [
        debit({ personId: command.personId }),
        credit({ accountId: command.accountId }),
      ];
    case "loan_received":
      return [
        debit({ accountId: command.accountId }),
        credit({ personId: command.personId }),
      ];
    case "repayment_received":
      return [
        debit({ accountId: command.accountId }),
        credit({ personId: command.personId }),
      ];
    case "repayment_made":
      return [
        debit({ personId: command.personId }),
        credit({ accountId: command.accountId }),
      ];
    case "adjustment":
      return [
        debit({ accountId: command.accountId }),
        credit({ externalKind: "equity" }),
      ];
  }
}

async function loadOwnedAccount(
  tx: TransactionContext,
  userId: string,
  accountId: string,
  currency: string,
): Promise<void> {
  const [account] = await tx
    .select({
      id: accounts.id,
      name: accounts.name,
      currency: accounts.currency,
      archivedAt: accounts.archivedAt,
    })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .limit(1);

  if (!account) {
    throw new AppError("NOT_FOUND", "Account not found");
  }

  if (account.archivedAt) {
    throw new AppError("CONFLICT", `${account.name} is archived`);
  }

  if (account.currency !== currency) {
    throw new AppError(
      "CONFLICT",
      `${account.name} is denominated in ${account.currency}, not ${currency}`,
    );
  }
}

async function loadOwnedPerson(
  tx: TransactionContext,
  userId: string,
  personId: string,
  currency: string,
): Promise<void> {
  const [person] = await tx
    .select({
      id: people.id,
      name: people.name,
      archivedAt: people.archivedAt,
    })
    .from(people)
    .where(and(eq(people.id, personId), eq(people.userId, userId)))
    .limit(1);

  if (!person) {
    throw new AppError("NOT_FOUND", "Person not found");
  }

  if (person.archivedAt) {
    throw new AppError("CONFLICT", `${person.name} is archived`);
  }

  // Person balances are per currency; loan commands carry their own currency.
  void currency;
}

async function assertOwnedTags(
  tx: TransactionContext,
  userId: string,
  tagIds: string[],
): Promise<void> {
  if (tagIds.length === 0) {
    return;
  }

  const rows = await tx
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.userId, userId), inArray(tags.id, tagIds)));

  if (rows.length !== new Set(tagIds).size) {
    throw new AppError("NOT_FOUND", "One or more tags were not found");
  }
}

async function outstandingLoanAmount(
  tx: TransactionContext,
  loanTransactionId: string,
  loanAmountMinor: bigint,
): Promise<bigint> {
  const [row] = await tx
    .select({
      repaid: sql<string>`coalesce(sum(${ledgerTransactions.amountMinor}), 0)`,
    })
    .from(transactionLinks)
    .innerJoin(
      ledgerTransactions,
      eq(ledgerTransactions.id, transactionLinks.fromTransactionId),
    )
    .where(
      and(
        eq(transactionLinks.toTransactionId, loanTransactionId),
        eq(transactionLinks.linkType, "repayment"),
        isNull(ledgerTransactions.reversedAt),
      ),
    );

  return loanAmountMinor - BigInt(row?.repaid ?? "0");
}

async function linkRepaymentToLoan(
  tx: TransactionContext,
  userId: string,
  command: Extract<
    LedgerCommandInput,
    { type: "repayment_received" | "repayment_made" }
  >,
  repaymentTransactionId: string,
  amountMinor: bigint,
): Promise<void> {
  if (!command.loanTransactionId) {
    return;
  }

  const [loan] = await tx
    .select({
      id: ledgerTransactions.id,
      type: ledgerTransactions.type,
      currency: ledgerTransactions.currency,
      amountMinor: ledgerTransactions.amountMinor,
      personId: ledgerTransactions.personId,
      reversedAt: ledgerTransactions.reversedAt,
    })
    .from(ledgerTransactions)
    .where(
      and(
        eq(ledgerTransactions.id, command.loanTransactionId),
        eq(ledgerTransactions.userId, userId),
      ),
    )
    .limit(1);

  if (!loan) {
    throw new AppError("NOT_FOUND", "Original loan not found");
  }

  const expectedLoanType =
    command.type === "repayment_received" ? "loan_given" : "loan_received";

  if (loan.type !== expectedLoanType) {
    throw new AppError(
      "CONFLICT",
      "This repayment does not match the selected loan",
    );
  }

  if (loan.personId !== command.personId) {
    throw new AppError("CONFLICT", "The repayment must be for the same person");
  }

  if (loan.reversedAt) {
    throw new AppError("CONFLICT", "The original loan was reversed");
  }

  if (loan.currency !== command.currency) {
    throw new AppError(
      "CONFLICT",
      `The loan is denominated in ${loan.currency}, not ${command.currency}`,
    );
  }

  const outstanding = await outstandingLoanAmount(tx, loan.id, loan.amountMinor);

  if (amountMinor > outstanding) {
    throw new AppError(
      "CONFLICT",
      `Only ${formatMinor(outstanding, loan.currency)} ${loan.currency} remains outstanding on this loan`,
    );
  }

  await tx.insert(transactionLinks).values({
    userId,
    fromTransactionId: repaymentTransactionId,
    toTransactionId: loan.id,
    linkType: "repayment",
  });
}

async function findByIdempotencyKey(
  db: Database,
  userId: string,
  idempotencyKey: string,
): Promise<string | null> {
  const [row] = await db
    .select({ id: ledgerTransactions.id })
    .from(ledgerTransactions)
    .where(
      and(
        eq(ledgerTransactions.userId, userId),
        eq(ledgerTransactions.idempotencyKey, idempotencyKey),
      ),
    )
    .limit(1);

  return row?.id ?? null;
}

/**
 * Records a financial command atomically: ownership checks, balanced entries,
 * tags, loan links, and the immutable event are all committed together.
 */
export async function postLedgerCommand(
  db: Database,
  userId: string,
  command: LedgerCommandInput,
): Promise<LedgerResult> {
  const amountMinor = parseAmountToMinor(command.amount, command.currency);

  if (amountMinor === null || amountMinor <= 0n) {
    throw new AppError("VALIDATION_ERROR", "Enter a valid amount");
  }

  const entries = planEntries(command, amountMinor);

  try {
    const transactionId = await db.transaction(async (tx) => {
      const accountIds = new Set<string>();

      for (const entry of entries) {
        if ("accountId" in entry) {
          accountIds.add(entry.accountId);
        }
      }

      for (const accountId of accountIds) {
        await loadOwnedAccount(tx, userId, accountId, command.currency);
      }

      if ("personId" in command) {
        await loadOwnedPerson(tx, userId, command.personId, command.currency);
      }

      await assertOwnedTags(tx, userId, command.tagIds);

      const [transaction] = await tx
        .insert(ledgerTransactions)
        .values({
          userId,
          type: command.type,
          occurredAt: command.occurredAt,
          description: command.description,
          notes: command.notes,
          currency: command.currency,
          amountMinor,
          personId: "personId" in command ? command.personId : null,
          idempotencyKey: command.idempotencyKey,
        })
        .returning({ id: ledgerTransactions.id });

      if (!transaction) {
        throw new AppError("INTERNAL", "Could not record the transaction");
      }

      await tx.insert(ledgerEntries).values(
        entries.map((entry) => ({
          transactionId: transaction.id,
          userId,
          accountId: "accountId" in entry ? entry.accountId : null,
          personId: "personId" in entry ? entry.personId : null,
          externalKind:
            "externalKind" in entry ? entry.externalKind : null,
          direction: entry.direction,
          amountMinor: entry.amountMinor,
          currency: command.currency,
        })),
      );

      const uniqueTagIds = [...new Set(command.tagIds)];

      if (uniqueTagIds.length > 0) {
        await tx.insert(transactionTags).values(
          uniqueTagIds.map((tagId) => ({
            transactionId: transaction.id,
            tagId,
          })),
        );
      }

      if (
        command.type === "repayment_received" ||
        command.type === "repayment_made"
      ) {
        await linkRepaymentToLoan(
          tx,
          userId,
          command,
          transaction.id,
          amountMinor,
        );
      }

      await tx.insert(financialEvents).values({
        userId,
        transactionId: transaction.id,
        eventType: `transaction.${command.type}`,
        payload: {
          transactionId: transaction.id,
          transactionType: command.type,
          amountMinor: amountMinor.toString(),
          currency: command.currency,
          occurredAt: command.occurredAt.toISOString(),
        },
        occurredAt: command.occurredAt,
        idempotencyKey: command.idempotencyKey,
      });

      return transaction.id;
    });

    return { transactionId, idempotent: false };
  } catch (error) {
    if (isUniqueViolation(error)) {
      const existingId = await findByIdempotencyKey(
        db,
        userId,
        command.idempotencyKey,
      );

      if (existingId) {
        return { transactionId: existingId, idempotent: true };
      }
    }

    throw error;
  }
}

/**
 * Reverses a posted transaction by appending a compensating transaction with
 * mirrored entries. The original event is never edited or deleted.
 */
export async function reverseLedgerTransaction(
  db: Database,
  userId: string,
  input: ReversalInput,
): Promise<LedgerResult> {
  try {
    const reversalId = await db.transaction(async (tx) => {
      const [original] = await tx
        .select()
        .from(ledgerTransactions)
        .where(
          and(
            eq(ledgerTransactions.id, input.transactionId),
            eq(ledgerTransactions.userId, userId),
          ),
        )
        .limit(1);

      if (!original) {
        throw new AppError("NOT_FOUND", "Transaction not found");
      }

      if (original.reversedAt || original.reversedByTransactionId) {
        throw new AppError("CONFLICT", "This transaction was already reversed");
      }

      if (original.type === "reversal") {
        throw new AppError("CONFLICT", "A reversal cannot itself be reversed");
      }

      const originalEntries = await tx
        .select()
        .from(ledgerEntries)
        .where(eq(ledgerEntries.transactionId, original.id));

      if (originalEntries.length === 0) {
        throw new AppError("INTERNAL", "The transaction has no ledger entries");
      }

      const [reversal] = await tx
        .insert(ledgerTransactions)
        .values({
          userId,
          type: "reversal",
          occurredAt: new Date(),
          description: `Reversal: ${original.description}`,
          notes: input.reason,
          currency: original.currency,
          amountMinor: original.amountMinor,
          personId: original.personId,
          reversesTransactionId: original.id,
          idempotencyKey: input.idempotencyKey,
        })
        .returning({ id: ledgerTransactions.id });

      if (!reversal) {
        throw new AppError("INTERNAL", "Could not record the reversal");
      }

      await tx.insert(ledgerEntries).values(
        originalEntries.map((entry) => ({
          transactionId: reversal.id,
          userId,
          accountId: entry.accountId,
          personId: entry.personId,
          externalKind: entry.externalKind,
          direction: entry.direction === "debit" ? ("credit" as const) : ("debit" as const),
          amountMinor: entry.amountMinor,
          currency: entry.currency,
        })),
      );

      const reversedAt = new Date();

      await tx
        .update(ledgerTransactions)
        .set({
          reversedAt,
          reversedByTransactionId: reversal.id,
        })
        .where(eq(ledgerTransactions.id, original.id));

      await tx.insert(transactionLinks).values({
        userId,
        fromTransactionId: reversal.id,
        toTransactionId: original.id,
        linkType: "reversal",
      });

      await tx.insert(financialEvents).values({
        userId,
        transactionId: reversal.id,
        eventType: "transaction.reversal",
        payload: {
          transactionId: reversal.id,
          transactionType: "reversal",
          reversesTransactionId: original.id,
          amountMinor: original.amountMinor.toString(),
          currency: original.currency,
          occurredAt: reversedAt.toISOString(),
        },
        occurredAt: reversedAt,
        idempotencyKey: input.idempotencyKey,
      });

      return reversal.id;
    });

    return { transactionId: reversalId, idempotent: false };
  } catch (error) {
    if (isUniqueViolation(error)) {
      const existingId = await findByIdempotencyKey(
        db,
        userId,
        input.idempotencyKey,
      );

      if (existingId) {
        return { transactionId: existingId, idempotent: true };
      }
    }

    throw error;
  }
}
