import { z } from "zod";

export const createPersonSchema = z.object({
  name: z.string().min(1, "Person name is required").max(100),
  contact: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export const updatePersonSchema = z.object({
  name: z.string().min(1, "Person name is required").max(100),
  contact: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export type CreatePersonInput = z.infer<typeof createPersonSchema>;
export type UpdatePersonInput = z.infer<typeof updatePersonSchema>;
