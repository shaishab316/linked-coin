import { describe, it, expect, beforeAll } from "vitest";
import { db } from "../../db";
import { users, accounts } from "../../db/schema";
import { hashPassword } from "../../lib/auth/password";
import { createPerson, listPeople, getPersonById, archivePerson, restorePerson } from "./service";
import { createTransaction } from "../ledger/service";

describe("People and Personal Debt Tracking Integration", () => {
  let userId: string;
  let cashAccountId: string;

  beforeAll(async () => {
    const [user] = await db
      .insert(users)
      .values({
        username: `test_people_${Date.now()}`,
        passwordHash: await hashPassword("ValidPassword123!"),
      })
      .returning();
    userId = user.id;

    const [cash] = await db
      .insert(accounts)
      .values({
        userId,
        name: "Pocket Cash",
        accountType: "cash",
        currency: "BDT",
      })
      .returning();
    cashAccountId = cash.id;
  });

  it("creates a person and accurately tracks outstanding loans and repayments", async () => {
    const person = await createPerson(userId, {
      name: "Tariqul",
      contact: "tariqul@test.com",
      notes: "Friend from university",
    });

    expect(person.id).toBeDefined();

    // Initial debt should be 0
    const initialProfile = await getPersonById(userId, person.id);
    expect(initialProfile.outstandingMinor).toBe(0n);

    // Lend 2,500 to Tariqul
    const loan = await createTransaction(userId, {
      type: "loan_given",
      amount: "2500",
      currency: "BDT",
      description: "Lent for book purchase",
      sourceAccountId: cashAccountId,
      personId: person.id,
      occurredAt: new Date().toISOString(),
    });

    const afterLoan = await getPersonById(userId, person.id);
    expect(afterLoan.outstandingMinor).toBe(250000n);

    // Tariqul repays 1,000
    await createTransaction(userId, {
      type: "repayment_received",
      amount: "1000",
      currency: "BDT",
      description: "First installment",
      destinationAccountId: cashAccountId,
      personId: person.id,
      linkedTransactionId: loan.id,
      occurredAt: new Date().toISOString(),
    });

    const afterRepay = await getPersonById(userId, person.id);
    expect(afterRepay.outstandingMinor).toBe(150000n);
  });
});
