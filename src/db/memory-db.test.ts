import { describe, it, expect } from "vitest";
import { getMemoryDatabase } from "./memory-db";
import { users } from "./schema";

describe("In-Memory Database for Testing", () => {
  it("initializes an isolated in-memory PostgreSQL instance with schema applied", async () => {
    const { db, pool } = getMemoryDatabase();

    expect(db).toBeDefined();
    expect(pool).toBeDefined();

    // Verify database operations execute directly in-memory
    const testUsername = `mem_user_${Date.now()}`;
    const [inserted] = await db
      .insert(users)
      .values({
        username: testUsername,
        passwordHash: "dummy_hash_for_test",
      })
      .returning();

    expect(inserted).toBeDefined();
    expect(inserted.id).toBeDefined();
    expect(inserted.username).toBe(testUsername);

    const queried = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.id, inserted.id),
    });

    expect(queried?.username).toBe(testUsername);
  });
});
