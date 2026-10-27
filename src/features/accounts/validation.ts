import { z } from "zod";
import { ACCOUNT_TYPES } from "../../db/schema/accounts";
import { SUPPORTED_CURRENCIES } from "../../lib/money/money";

export const createAccountSchema = z.object({
  name: z.string().min(1, "Account name is required").max(100),
  accountType: z.enum(ACCOUNT_TYPES, {
    errorMap: () => ({ message: "Invalid account type" }),
  }),
  currency: z
    .string()
    .length(3, "Currency must be a 3-letter code")
    .toUpperCase()
    .refine((val) => val in SUPPORTED_CURRENCIES, {
      message: "Unsupported currency code",
    }),
  initialBalance: z.string().optional().default("0"),
  description: z.string().max(500).optional(),
});

export const updateAccountSchema = z.object({
  name: z.string().min(1, "Account name is required").max(100),
  description: z.string().max(500).optional(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
