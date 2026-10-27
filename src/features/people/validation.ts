import { z } from "zod";

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length > 0 ? value : null));

export const createPersonSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(80, "Name must be at most 80 characters long"),
  contact: nullableText(120),
  notes: nullableText(500),
});

export type CreatePersonInput = z.infer<typeof createPersonSchema>;

export const setPersonArchivedSchema = z.object({
  personId: z.uuid("Choose a person"),
  archived: z.enum(["true", "false"]),
});
