import { z } from "zod";

export const createTagSchema = z.object({
  name: z.string().min(1, "Tag name is required").max(50),
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
