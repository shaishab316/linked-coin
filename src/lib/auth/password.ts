import { hash, verify } from "@node-rs/argon2";

/** `Algorithm.Argon2id` from @node-rs/argon2, which is a const enum. */
const ARGON2ID = 2;

/**
 * OWASP-recommended Argon2id baseline (19 MiB, 2 iterations, 1 lane).
 * Salts are generated per hash by the library.
 */
const ARGON2ID_OPTIONS = {
  algorithm: ARGON2ID,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2ID_OPTIONS);
}

/** Returns false rather than throwing for malformed or foreign hash values. */
export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}
