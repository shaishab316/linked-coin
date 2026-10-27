import { z } from "zod";

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 32;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 200;

/**
 * Usernames are compared and stored in a normalized form so that
 * "Ada" and "ada" cannot both be registered.
 */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export const usernameSchema = z
  .string()
  .trim()
  .min(USERNAME_MIN_LENGTH, "Username must be at least 3 characters long")
  .max(USERNAME_MAX_LENGTH, "Username must be at most 32 characters long")
  .regex(
    /^[A-Za-z0-9_]+$/,
    "Username may only contain letters, numbers, and underscores",
  )
  .transform(normalizeUsername);

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, "Password must be at least 8 characters long")
  .max(PASSWORD_MAX_LENGTH, "Password must be at most 200 characters long");

export const signUpSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export const signInSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, "Password is required"),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
