import { z } from "zod";

import {
  isSupportedCurrency,
  parseAmountToMinor,
} from "@/lib/money/money";

export const COMMAND_TYPES = [
  "income",
  "expense",
  "transfer",
  "loan_given",
  "loan_received",
  "repayment_received",
  "repayment_made",
  "adjustment",
] as const;

export type CommandType = (typeof COMMAND_TYPES)[number];

export const COMMAND_TYPE_LABELS: Record<CommandType, string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
  loan_given: "Money lent",
  loan_received: "Money borrowed",
  repayment_received: "Repayment received",
  repayment_made: "Repayment made",
  adjustment: "Opening balance",
};

/** Interprets `datetime-local` input as UTC so results are deployment-stable. */
export function parseOccurredAt(value: string): Date | null {
  const withSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
    ? `${value}:00Z`
    : value;

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(withSeconds)) {
    return null;
  }

  const date = new Date(withSeconds);

  return Number.isNaN(date.getTime()) ? null : date;
}

const occurredAtSchema = z
  .string()
  .trim()
  .min(1, "Date and time are required")
  .transform((value) => parseOccurredAt(value))
  .refine((value): value is Date => value instanceof Date, {
    message: "Enter a valid date and time",
  });

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length > 0 ? value : null));

const baseCommandSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(200, "Description must be at most 200 characters long"),
  notes: nullableText(1000),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .refine(isSupportedCurrency, "Unsupported currency"),
  amount: z.string().trim().min(1, "Amount is required"),
  occurredAt: occurredAtSchema,
  idempotencyKey: z.uuid("A valid idempotency key is required"),
  tagIds: z.array(z.uuid()).max(20, "Use at most 20 tags").default([]),
});

const accountCommand = baseCommandSchema.extend({
  accountId: z.uuid("Choose an account"),
});

const loanCommand = accountCommand.extend({
  personId: z.uuid("Choose a person"),
});

const repaymentCommand = loanCommand.extend({
  loanTransactionId: z
    .union([z.uuid(), z.literal("")])
    .optional()
    .transform((value) => (value ? value : null)),
});

export const ledgerCommandSchema = z
  .discriminatedUnion("type", [
    accountCommand.extend({ type: z.literal("income") }),
    accountCommand.extend({ type: z.literal("expense") }),
    baseCommandSchema.extend({
      type: z.literal("transfer"),
      fromAccountId: z.uuid("Choose the source account"),
      toAccountId: z.uuid("Choose the destination account"),
    }),
    loanCommand.extend({ type: z.literal("loan_given") }),
    loanCommand.extend({ type: z.literal("loan_received") }),
    repaymentCommand.extend({ type: z.literal("repayment_received") }),
    repaymentCommand.extend({ type: z.literal("repayment_made") }),
    baseCommandSchema.extend({
      type: z.literal("adjustment"),
      accountId: z.uuid("Choose an account"),
    }),
  ])
  .superRefine((command, ctx) => {
    const minor = parseAmountToMinor(command.amount, command.currency);

    if (minor === null) {
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message: "Enter a valid amount for this currency (for example 125.50)",
      });
      return;
    }

    if (minor <= 0n) {
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message: "Amount must be greater than zero",
      });
    }

    if (
      command.type === "transfer" &&
      command.fromAccountId === command.toAccountId
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["toAccountId"],
        message: "Source and destination accounts must differ",
      });
    }
  });

export type LedgerCommandInput = z.infer<typeof ledgerCommandSchema>;

export const reversalSchema = z.object({
  transactionId: z.uuid("Choose a transaction"),
  idempotencyKey: z.uuid("A valid idempotency key is required"),
  reason: nullableText(500),
});

export type ReversalInput = z.infer<typeof reversalSchema>;
