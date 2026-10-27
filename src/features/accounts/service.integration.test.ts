import { beforeAll, beforeEach, afterAll, describe, expect, it } from "vitest";

import { registerUser } from "@/features/auth/service";
import {
  createTestContext,
  hasTestDatabase,
  type TestContext,
} from "../../../tests/helpers/database";

import {
  archiveAccountForUser,
  createAccountForUser,
  getAccountForUser,
  listAccountsForUser,
} from "./service";

describe.skipIf(!hasTestDatabase)("account ownership (PostgreSQL)", () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestContext();
  });

  beforeEach(async () => {
    await context.reset();
  });

  afterAll(async () => {
    await context?.close();
  });

  async function createTwoUsers() {
    const ada = await registerUser(context.db, {
      username: "ada",
      password: "correct-horse",
    });
    const grace = await registerUser(context.db, {
      username: "grace",
      password: "correct-horse",
    });

    return { ada, grace };
  }

  it("scopes listings to the owning user", async () => {
    const { ada, grace } = await createTwoUsers();

    await createAccountForUser(context.db, ada.id, {
      name: "Ada cash",
      accountType: "cash",
      currency: "BDT",
      description: null,
    });

    await expect(listAccountsForUser(context.db, ada.id)).resolves.toHaveLength(1);
    await expect(listAccountsForUser(context.db, grace.id)).resolves.toEqual([]);
  });

  it("refuses to read another user's account by id", async () => {
    const { ada, grace } = await createTwoUsers();
    const account = await createAccountForUser(context.db, ada.id, {
      name: "Ada savings",
      accountType: "savings",
      currency: "BDT",
      description: null,
    });

    await expect(
      getAccountForUser(context.db, ada.id, account.id),
    ).resolves.toMatchObject({ id: account.id });
    await expect(
      getAccountForUser(context.db, grace.id, account.id),
    ).resolves.toBeNull();
  });

  it("refuses to archive another user's account", async () => {
    const { ada, grace } = await createTwoUsers();
    const account = await createAccountForUser(context.db, ada.id, {
      name: "Ada wallet",
      accountType: "digital_wallet",
      currency: "USD",
      description: "Travel money",
    });

    await expect(
      archiveAccountForUser(context.db, grace.id, account.id),
    ).resolves.toBe(false);

    const [unchanged] = await listAccountsForUser(context.db, ada.id);
    expect(unchanged?.archivedAt).toBeNull();
  });

  it("archives without deleting the account", async () => {
    const { ada } = await createTwoUsers();
    const account = await createAccountForUser(context.db, ada.id, {
      name: "Old bank",
      accountType: "bank",
      currency: "BDT",
      description: null,
    });

    await expect(
      archiveAccountForUser(context.db, ada.id, account.id),
    ).resolves.toBe(true);

    const accounts = await listAccountsForUser(context.db, ada.id);
    expect(accounts).toHaveLength(1);
    expect(accounts[0]?.archivedAt).toBeInstanceOf(Date);
  });

  it("reports unknown accounts as not found", async () => {
    const { ada } = await createTwoUsers();

    await expect(
      getAccountForUser(context.db, ada.id, crypto.randomUUID()),
    ).resolves.toBeNull();
  });
});
