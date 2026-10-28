import { z } from "zod";
import { TRANSACTION_TYPES } from "../../db/schema/ledger";
import { SUPPORTED_CURRENCIES } from "../../lib/money/money";

export const addonTransactionSchema = z.object({
  description: z.string().min(1, "Addon description is required").max(255),
  amount: z.string().min(1, "Addon amount is required"),
  type: z.enum(TRANSACTION_TYPES).optional().default("expense"),
  sourceAccountId: z.string().uuid().optional().nullable(),
  destinationAccountId: z.string().uuid().optional().nullable(),
  tagIds: z.array(z.string().uuid()).optional().default([]),
  notes: z.string().max(1000).optional().nullable(),
});

export type AddonTransactionInput = z.infer<typeof addonTransactionSchema>;

export const createTransactionSchema = z
  .object({
    type: z.enum(TRANSACTION_TYPES),
    amount: z.string().min(1, "Amount is required"),
    currency: z
      .string()
      .length(3)
      .toUpperCase()
      .refine((c) => c in SUPPORTED_CURRENCIES, { message: "Unsupported currency" }),
    description: z.string().min(1, "Description is required").max(255),
    notes: z.string().max(1000).optional(),
    occurredAt: z.string().min(1, "Occurrence date is required"),
    idempotencyKey: z.string().min(1).optional().default(() => crypto.randomUUID()),

    // Accounts
    sourceAccountId: z.string().uuid().optional().nullable(),
    destinationAccountId: z.string().uuid().optional().nullable(),

    // Person (for loans and repayments)
    personId: z.string().uuid().optional().nullable(),
    linkedTransactionId: z.string().uuid().optional().nullable(),
    parentTransactionId: z.string().uuid().optional().nullable(),

    // Tags
    tagIds: z.array(z.string().uuid()).optional().default([]),

    // Addons
    addons: z.array(addonTransactionSchema).optional().default([]),
  })
  .superRefine((data, ctx) => {
    if (data.type === "expense") {
      if (!data.sourceAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Source account is required for expenses",
          path: ["sourceAccountId"],
        });
      }
    } else if (data.type === "income") {
      if (!data.destinationAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Destination account is required for income",
          path: ["destinationAccountId"],
        });
      }
    } else if (data.type === "transfer") {
      if (!data.sourceAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Source account is required for transfers",
          path: ["sourceAccountId"],
        });
      }
      if (!data.destinationAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Destination account is required for transfers",
          path: ["destinationAccountId"],
        });
      }
      if (data.sourceAccountId && data.sourceAccountId === data.destinationAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Source and destination accounts must be different",
          path: ["destinationAccountId"],
        });
      }
    } else if (data.type === "loan_given") {
      if (!data.sourceAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Source account is required when lending money",
          path: ["sourceAccountId"],
        });
      }
      if (!data.personId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Person is required when lending money",
          path: ["personId"],
        });
      }
    } else if (data.type === "loan_received") {
      if (!data.destinationAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Destination account is required when borrowing money",
          path: ["destinationAccountId"],
        });
      }
      if (!data.personId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Person is required when borrowing money",
          path: ["personId"],
        });
      }
    } else if (data.type === "repayment_received") {
      if (!data.destinationAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Destination account is required for repayment received",
          path: ["destinationAccountId"],
        });
      }
      if (!data.personId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Person is required for repayment received",
          path: ["personId"],
        });
      }
    } else if (data.type === "repayment_made") {
      if (!data.sourceAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Source account is required for repayment made",
          path: ["sourceAccountId"],
        });
      }
      if (!data.personId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Person is required for repayment made",
          path: ["personId"],
        });
      }
    }
  });

export const reverseTransactionSchema = z.object({
  reason: z.string().min(1, "A reversal reason is required").max(500),
  idempotencyKey: z.string().min(1).optional().default(() => crypto.randomUUID()),
});

export const updateTransactionSchema = z
  .object({
    description: z.string().min(1, "Description cannot be empty").max(255).optional(),
    amount: z.string().min(1, "Amount cannot be empty").optional(),
    notes: z.string().max(1000).optional().nullable(),
    occurredAt: z.string().min(1, "Occurrence date is required").optional(),
    sourceAccountId: z.string().uuid().optional().nullable(),
    destinationAccountId: z.string().uuid().optional().nullable(),
    personId: z.string().uuid().optional().nullable(),
    tagIds: z.array(z.string().uuid()).optional(),
    confirmationCode: z.string().min(1, "Confirmation code is required"),
    expectedCode: z.string().min(1, "Expected confirmation code is missing"),
  })
  .refine(
    (data) =>
      data.confirmationCode.trim().toUpperCase() === data.expectedCode.trim().toUpperCase(),
    {
      message: "Confirmation code does not match. Please enter the exact 8-character verification code.",
      path: ["confirmationCode"],
    },
  );

export interface UpdateTransactionData {
  description?: string;
  amount?: string;
  notes?: string | null;
  occurredAt?: string;
  sourceAccountId?: string | null;
  destinationAccountId?: string | null;
  personId?: string | null;
  tagIds?: string[];
}

export type CreateTransactionInput = z.input<typeof createTransactionSchema>;
export type ReverseTransactionInput = z.input<typeof reverseTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type ValidatedTransactionInput = z.output<typeof createTransactionSchema>;
