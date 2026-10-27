import { describe, it, expect, beforeAll } from "vitest";
import { db } from "../../db";
import { users } from "../../db/schema";
import { hashPassword } from "../../lib/auth/password";
import {
  createAccount,
  listAccounts,
  getAccountById,
  archiveAccount,
  restoreAccount,
} from "./service";

describe("Accounts Service Integration", () => {
  let userId: string;

  beforeAll(async () => {
    const [user] = await db
      .insert(users)
      .values({
        username: `test_acc_user_${Date.now()}`,
        passwordHash: await hashPassword("ValidPassword123!"),
      })
      .returning();
    userId = user.id;
  });

  it("creates an account with initial opening balance ledger entry", async () => {
    const account = await createAccount(userId, {
      name: "City Bank Savings",
      accountType: "savings",
      currency: "BDT",
      initialBalance: "1500.50",
      description: "Emergency reserve",
    });

    expect(account.id).toBeDefined();
    expect(account.balanceMinor).toBe(150050n);

    // Verify fetched account maintains identical balance
    const fetched = await getAccountById(userId, account.id);
    expect(fetched.balanceMinor).toBe(150050n);
  });

  it("lists user accounts and excludes archived accounts by default", async () => {
    const acc1 = await createAccount(userId, {
      name: "Active Account",
      accountType: "cash",
      currency: "BDT",
      initialBalance: "100",
    });

    const acc2 = await createAccount(userId, {
      name: "To Archive",
      accountType: "custom",
      currency: "BDT",
      initialBalance: "50",
    });

    await archiveAccount(userId, acc2.id);

    const activeList = await listAccounts(userId, false);
    expect(activeList.some((a) => a.id === acc1.id)).toBe(true);
    expect(activeList.some((a) => a.id === acc2.id)).toBe(false);

    const allList = await listAccounts(userId, true);
    expect(allList.some((a) => a.id === acc2.id)).toBe(true);

    await restoreAccount(userId, acc2.id);
    const restoredList = await listAccounts(userId, false);
    expect(restoredList.some((a) => a.id === acc2.id)).toBe(true);
  });
});
