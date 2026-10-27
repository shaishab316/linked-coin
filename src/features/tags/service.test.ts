import { describe, it, expect, beforeAll } from "vitest";
import { db } from "../../db";
import { users, accounts, people } from "../../db/schema";
import { hashPassword } from "../../lib/auth/password";
import {
  createTag,
  listTags,
  setPersonTags,
  getPersonTagIds,
  getPersonTags,
  addPersonTag,
  removePersonTag,
  setAccountTags,
  getAccountTagIds,
  getAccountTags,
  addAccountTag,
  removeAccountTag,
} from "./service";

describe("Tag Service & Multi-Entity Tagging Integration", () => {
  let userId: string;
  let testAccountId: string;
  let testPersonId: string;

  beforeAll(async () => {
    const [user] = await db
      .insert(users)
      .values({
        username: `test_tags_${Date.now()}`,
        passwordHash: await hashPassword("ValidPassword123!"),
      })
      .returning();
    userId = user.id;

    const [acc] = await db
      .insert(accounts)
      .values({
        userId,
        name: "Test Bank Account",
        accountType: "bank",
        currency: "BDT",
      })
      .returning();
    testAccountId = acc.id;

    const [p] = await db
      .insert(people)
      .values({
        userId,
        name: "Test Person",
      })
      .returning();
    testPersonId = p.id;
  });

  it("creates tags of different types (transaction, person, account)", async () => {
    const txTag = await createTag(userId, {
      name: "Groceries",
      tagType: "transaction",
    });
    expect(txTag.tagType).toBe("transaction");

    const personTag = await createTag(userId, {
      name: "Family",
      tagType: "person",
    });
    expect(personTag.tagType).toBe("person");

    const accountTag = await createTag(userId, {
      name: "Savings Goal",
      tagType: "account",
    });
    expect(accountTag.tagType).toBe("account");

    // Can create same tag name across different types without conflict
    const sharedNamePerson = await createTag(userId, {
      name: "Business",
      tagType: "person",
    });
    const sharedNameAccount = await createTag(userId, {
      name: "Business",
      tagType: "account",
    });
    expect(sharedNamePerson.id).not.toBe(sharedNameAccount.id);

    // List tags filtered by type
    const personTagsList = await listTags(userId, false, "person");
    expect(personTagsList.some((t) => t.name === "Family")).toBe(true);
    expect(personTagsList.every((t) => t.tagType === "person")).toBe(true);
  });

  it("supports assigning and modifying multiple tags for a person", async () => {
    const tag1 = await createTag(userId, { name: "Friend", tagType: "person" });
    const tag2 = await createTag(userId, { name: "Colleague", tagType: "person" });
    const tag3 = await createTag(userId, { name: "VIP", tagType: "person" });

    // Set multiple tags
    await setPersonTags(testPersonId, [tag1.id, tag2.id]);
    let tagIds = await getPersonTagIds(testPersonId);
    expect(tagIds).toHaveLength(2);
    expect(tagIds).toContain(tag1.id);
    expect(tagIds).toContain(tag2.id);

    // Add a single tag
    await addPersonTag(testPersonId, tag3.id);
    tagIds = await getPersonTagIds(testPersonId);
    expect(tagIds).toHaveLength(3);
    expect(tagIds).toContain(tag3.id);

    // Fetch full Tag objects
    const fullTags = await getPersonTags(testPersonId);
    expect(fullTags).toHaveLength(3);
    expect(fullTags.map((t) => t.name)).toContain("VIP");

    // Remove a tag
    await removePersonTag(testPersonId, tag2.id);
    tagIds = await getPersonTagIds(testPersonId);
    expect(tagIds).toHaveLength(2);
    expect(tagIds).not.toContain(tag2.id);
  });

  it("supports assigning and modifying multiple tags for an account", async () => {
    const tag1 = await createTag(userId, { name: "Primary", tagType: "account" });
    const tag2 = await createTag(userId, { name: "Emergency Fund", tagType: "account" });

    // Set multiple tags
    await setAccountTags(testAccountId, [tag1.id, tag2.id]);
    let tagIds = await getAccountTagIds(testAccountId);
    expect(tagIds).toHaveLength(2);
    expect(tagIds).toContain(tag1.id);
    expect(tagIds).toContain(tag2.id);

    // Fetch full Tag objects
    const fullTags = await getAccountTags(testAccountId);
    expect(fullTags).toHaveLength(2);
    expect(fullTags.map((t) => t.name)).toContain("Emergency Fund");

    // Remove a tag
    await removeAccountTag(testAccountId, tag1.id);
    tagIds = await getAccountTagIds(testAccountId);
    expect(tagIds).toHaveLength(1);
    expect(tagIds[0]).toBe(tag2.id);
  });
});
