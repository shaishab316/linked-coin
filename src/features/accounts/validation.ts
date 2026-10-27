import { z } from "zod";

export const ACCOUNT_TYPE_VALUES = [
  "cash",
  "bank",
  "savings",
  "digital_wallet",
  "credit",
  "custom",
] as const;

export const accountTypeSchema = z.enum(ACCOUNT_TYPE_VALUES);

export const ACCOUNT_TYPE_LABELS: Record<
  (typeof ACCOUNT_TYPE_VALUES)[number],
  string
> = {
  cash: "Cash",
  bank: "Bank",
  savings: "Savings",
  digital_wallet: "Digital wallet",
  credit: "Credit",
  custom: "Custom",
};

export const createAccountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Account name is required")
    .max(80, "Account name must be at most 80 characters long"),
  accountType: accountTypeSchema,
  currency: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{3}$/, "Use a three-letter currency code such as BDT or USD")
    .transform((value) => value.toUpperCase()),
  description: z
    .string()
    .trim()
    .max(280, "Description must be at most 280 characters long")
    .transform((value) => (value.length > 0 ? value : null)),
});

export const archiveAccountSchema = z.object({
  accountId: z.uuid("A valid account id is required"),
});

export const updateAccountSchema = z.object({
  accountId: z.uuid("A valid account id is required"),
  name: z
    .string()
    .trim()
    .min(1, "Account name is required")
    .max(80, "Account name must be at most 80 characters long"),
  description: z
    .string()
    .trim()
    .max(280, "Description must be at most 280 characters long")
    .transform((value) => (value.length > 0 ? value : null)),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
