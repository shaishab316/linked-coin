import { z } from "zod";
import { TRANSACTION_TYPES } from "../../db/schema/ledger";
import { SUPPORTED_CURRENCIES } from "../../lib/money/money";

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

    // Tags
    tagIds: z.array(z.string().uuid()).optional().default([]),
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

export type CreateTransactionInput = z.input<typeof createTransactionSchema>;
export type ReverseTransactionInput = z.input<typeof reverseTransactionSchema>;
export type ValidatedTransactionInput = z.output<typeof createTransactionSchema>;
