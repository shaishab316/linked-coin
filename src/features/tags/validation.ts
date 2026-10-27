import { z } from "zod";

export const createTagSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Tag name is required")
    .max(40, "Tag name must be at most 40 characters long"),
  description: z
    .string()
    .trim()
    .max(200, "Description must be at most 200 characters long")
    .transform((value) => (value.length > 0 ? value : null)),
  parentId: z
    .union([z.uuid(), z.literal("")])
    .optional()
    .transform((value) => (value ? value : null)),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;

export const setTagArchivedSchema = z.object({
  tagId: z.uuid("Choose a tag"),
  archived: z.enum(["true", "false"]),
});
