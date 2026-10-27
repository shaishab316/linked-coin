import { z } from "zod";
import { TAG_TYPES } from "../../db/schema/tags";

export const createTagSchema = z.object({
  name: z.string().min(1, "Tag name is required").max(50),
  tagType: z.enum(TAG_TYPES).default("transaction"),
  parentId: z.string().uuid("Invalid parent tag ID").optional().nullable(),
  description: z.string().max(255).optional(),
});

export const updateTagSchema = z.object({
  name: z.string().min(1, "Tag name is required").max(50),
  parentId: z.string().uuid("Invalid parent tag ID").optional().nullable(),
  description: z.string().max(255).optional(),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
