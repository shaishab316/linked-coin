import { and, asc, eq } from "drizzle-orm";

import type { Database } from "@/db";
import { people } from "@/db/schema";

import type { CreatePersonInput } from "./validation";

export type PersonRecord = {
  id: string;
  name: string;
  contact: string | null;
  notes: string | null;
  createdAt: Date;
  archivedAt: Date | null;
};

const personColumns = {
  id: people.id,
  name: people.name,
  contact: people.contact,
  notes: people.notes,
  createdAt: people.createdAt,
  archivedAt: people.archivedAt,
};

export async function listPeopleForUser(
  db: Database,
  userId: string,
): Promise<PersonRecord[]> {
  return db
    .select(personColumns)
    .from(people)
    .where(eq(people.userId, userId))
    .orderBy(asc(people.archivedAt), asc(people.name));
}

export async function getPersonForUser(
  db: Database,
  userId: string,
  personId: string,
): Promise<PersonRecord | null> {
  const [person] = await db
    .select(personColumns)
    .from(people)
    .where(and(eq(people.id, personId), eq(people.userId, userId)))
    .limit(1);

  return person ?? null;
}

export async function createPersonForUser(
  db: Database,
  userId: string,
  input: CreatePersonInput,
): Promise<PersonRecord> {
  const [person] = await db
    .insert(people)
    .values({
      userId,
      name: input.name,
      contact: input.contact,
      notes: input.notes,
    })
    .returning(personColumns);

  if (!person) {
    throw new Error("Person insert did not return a row");
  }

  return person;
}

/** Archiving keeps every linked loan and repayment intact. */
export async function setPersonArchivedForUser(
  db: Database,
  userId: string,
  personId: string,
  archived: boolean,
): Promise<boolean> {
  const rows = await db
    .update(people)
    .set({
      archivedAt: archived ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(and(eq(people.id, personId), eq(people.userId, userId)))
    .returning({ id: people.id });

  return rows.length > 0;
}
