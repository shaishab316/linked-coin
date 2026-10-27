import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://linked_coin:linked_coin_dev@localhost:55432/linked_coin",
  },
  strict: true,
  verbose: true,
});
