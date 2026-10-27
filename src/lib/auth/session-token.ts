import { createHash, randomBytes } from "node:crypto";

const SESSION_TOKEN_BYTES = 32;

/** 256 bits of entropy, URL-safe so it can live in a cookie. */
export function generateSessionToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString("base64url");
}

/**
 * Only the hash is stored server-side, so a database leak does not expose
 * usable session tokens.
 */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
