import { z } from "zod";
import { TRANSACTION_TYPES } from "../../db/schema/ledger";

export const queryAstSchema = z.object({
  date: z
    .object({
      from: z.string().optional(),
      to: z.string().optional(),
    })
    .optional(),
  accountIds: z.array(z.string().uuid()).optional(),
  personIds: z.array(z.string().uuid()).optional(),
  tagIds: z.array(z.string().uuid()).optional(),
  transactionTypes: z.array(z.enum(TRANSACTION_TYPES)).optional(),
  amount: z
    .object({
      min: z.string().optional(),
      max: z.string().optional(),
    })
    .optional(),
  currency: z.string().length(3).toUpperCase().optional(),
  text: z.string().max(200).optional(),
  isReversed: z.boolean().optional(),
  sort: z
    .object({
      field: z.enum(["occurredAt", "amount"]).default("occurredAt"),
      direction: z.enum(["asc", "desc"]).default("desc"),
    })
    .default({ field: "occurredAt", direction: "desc" }),
  limit: z.number().int().min(1).max(250).default(50),
  offset: z.number().int().min(0).default(0),
  cursor: z.string().optional(),
});

export const saveQuerySchema = z.object({
  name: z.string().min(1, "Query name is required").max(100),
  queryAst: queryAstSchema,
});

export type ValidatedQueryAst = z.infer<typeof queryAstSchema>;
export type SaveQueryInput = z.infer<typeof saveQuerySchema>;
