import { z } from "zod";

export const createNoteSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(300, "Title too long (max 300 characters)"),
  content: z.string().max(100_000, "Content too long").default(""),
  tags: z
    .array(z.string().max(50))
    .max(10, "Too many tags (max 10)")
    .default([]),
  is_pinned: z.boolean().default(false),
});

export const updateNoteSchema = createNoteSchema.partial();

export const notesFilterSchema = z.object({
  search: z.string().max(500).optional(),
  tags: z.array(z.string()).optional(),
  sortBy: z.enum(["updated_at", "created_at", "title"]).default("updated_at"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type NotesFilterInput = z.infer<typeof notesFilterSchema>;
