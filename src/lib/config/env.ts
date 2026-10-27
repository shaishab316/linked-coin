import { z } from "zod";

/**
 * Server-only configuration. Validation happens on first access so that
 * build-time tooling never needs production credentials.
 */
const serverEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      (value) => value.startsWith("postgres://") || value.startsWith("postgresql://"),
      "DATABASE_URL must be a PostgreSQL connection string",
    ),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters long"),
  APP_URL: z.url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | undefined;

export function parseServerEnv(source: NodeJS.ProcessEnv): ServerEnv {
  const result = serverEnvSchema.safeParse(source);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid environment configuration — ${details}`);
  }

  return result.data;
}

export function getServerEnv(): ServerEnv {
  cachedEnv ??= parseServerEnv(process.env);

  return cachedEnv;
}

export function isProduction(): boolean {
  return getServerEnv().NODE_ENV === "production";
}
