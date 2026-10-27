import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env | null = null;

export function getEnv(): Env {
  if (parsedEnv) {
    return parsedEnv;
  }

  const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true";

  const result = envSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL || (isTest ? "postgresql://postgres:postgres@localhost:5432/in_memory_test" : undefined),
    SESSION_SECRET: process.env.SESSION_SECRET || (isTest ? "test_session_secret_at_least_32_characters_long_for_tests!" : undefined),
    APP_URL: process.env.APP_URL || "http://localhost:3000",
    NODE_ENV: process.env.NODE_ENV || (isTest ? "test" : "development"),
  });

  if (!result.success) {
    const errorDetails = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join(", ");
    throw new Error(`Environment validation failed: ${errorDetails}`);
  }

  parsedEnv = result.data;
  return parsedEnv;
}
