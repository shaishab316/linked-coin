import { eq, and, isNull, sql } from "drizzle-orm";
import { db } from "../../db";
import { people, ledgerEntries, type Person } from "../../db/schema";
import { AppError } from "../../lib/errors/app-error";
import {
  createPersonSchema,
  updatePersonSchema,
  type CreatePersonInput,
  type UpdatePersonInput,
} from "./validation";

export interface PersonWithBalance extends Person {
  outstandingMinor: bigint; // positive: they owe you (receivable); negative: you owe them (payable)
}

export async function createPerson(userId: string, input: CreatePersonInput): Promise<Person> {
  const parsed = createPersonSchema.parse(input);

  const [person] = await db
    .insert(people)
    .values({
      userId,
      name: parsed.name,
      contact: parsed.contact || null,
      notes: parsed.notes || null,
    })
    .returning();

  return person;
}

export async function listPeople(
  userId: string,
  includeArchived = false,
): Promise<PersonWithBalance[]> {
  const conditions = [eq(people.userId, userId)];
  if (!includeArchived) {
    conditions.push(isNull(people.archivedAt));
  }

  const userPeople = await db
    .select()
    .from(people)
    .where(and(...conditions))
    .orderBy(people.name);

  if (userPeople.length === 0) return [];

  // Group ledger entries by personId to calculate outstanding debt
  const balances = await db
    .select({
      personId: ledgerEntries.personId,
      debitSum: sql<string>`coalesce(sum(case when direction = 'debit' then amount_minor else 0 end), 0)`,
      creditSum: sql<string>`coalesce(sum(case when direction = 'credit' then amount_minor else 0 end), 0)`,
    })
    .from(ledgerEntries)
    .where(eq(ledgerEntries.userId, userId))
    .groupBy(ledgerEntries.personId);

  const balanceMap = new Map<string, bigint>();
  for (const b of balances) {
    if (b.personId) {
      const debits = BigInt(b.debitSum || "0");
      const credits = BigInt(b.creditSum || "0");
      // Debits increase receivable (they owe you); credits decrease receivable
      balanceMap.set(b.personId, debits - credits);
    }
  }

  return userPeople.map((p) => ({
    ...p,
    outstandingMinor: balanceMap.get(p.id) || 0n,
  }));
}

export async function getPersonById(userId: string, personId: string): Promise<PersonWithBalance> {
  const [person] = await db
    .select()
    .from(people)
    .where(and(eq(people.id, personId), eq(people.userId, userId)))
    .limit(1);

  if (!person) {
    throw AppError.notFound("Person not found");
  }

  const [balanceRow] = await db
    .select({
      debitSum: sql<string>`coalesce(sum(case when direction = 'debit' then amount_minor else 0 end), 0)`,
      creditSum: sql<string>`coalesce(sum(case when direction = 'credit' then amount_minor else 0 end), 0)`,
    })
    .from(ledgerEntries)
    .where(and(eq(ledgerEntries.userId, userId), eq(ledgerEntries.personId, personId)));

  const debits = BigInt(balanceRow?.debitSum || "0");
  const credits = BigInt(balanceRow?.creditSum || "0");

  return {
    ...person,
    outstandingMinor: debits - credits,
  };
}

export async function updatePerson(
  userId: string,
  personId: string,
  input: UpdatePersonInput,
): Promise<Person> {
  const parsed = updatePersonSchema.parse(input);

  const [updated] = await db
    .update(people)
    .set({
      name: parsed.name,
      contact: parsed.contact || null,
      notes: parsed.notes || null,
      updatedAt: new Date(),
    })
    .where(and(eq(people.id, personId), eq(people.userId, userId)))
    .returning();

  if (!updated) {
    throw AppError.notFound("Person not found");
  }

  return updated;
}

export async function archivePerson(userId: string, personId: string): Promise<Person> {
  const [updated] = await db
    .update(people)
    .set({
      archivedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(people.id, personId), eq(people.userId, userId)))
    .returning();

  if (!updated) {
    throw AppError.notFound("Person not found");
  }

  return updated;
}

export async function restorePerson(userId: string, personId: string): Promise<Person> {
  const [updated] = await db
    .update(people)
    .set({
      archivedAt: null,
      updatedAt: new Date(),
    })
    .where(and(eq(people.id, personId), eq(people.userId, userId)))
    .returning();

  if (!updated) {
    throw AppError.notFound("Person not found");
  }

  return updated;
}
