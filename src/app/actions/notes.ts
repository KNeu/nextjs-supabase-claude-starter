"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createNoteSchema,
  updateNoteSchema,
  notesFilterSchema,
  type CreateNoteInput,
  type UpdateNoteInput,
  type NotesFilterInput,
} from "@/lib/validations/notes";
import type { ActionResult, Note, PaginatedResult } from "@/types";

export async function createNote(input: CreateNoteInput): Promise<ActionResult<Note>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Unauthorized" };

  const parsed = createNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Validation error" };
  }

  const { data, error } = await supabase
    .from("notes")
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/notes");
  return { success: true, data };
}

export async function updateNote(
  id: string,
  input: UpdateNoteInput
): Promise<ActionResult<Note>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Unauthorized" };

  const parsed = updateNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Validation error" };
  }

  const { data, error } = await supabase
    .from("notes")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/notes");
  revalidatePath(`/notes/${id}`);
  return { success: true, data };
}

export async function deleteNote(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Unauthorized" };

  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/notes");
  return { success: true };
}

export async function toggleNotePin(id: string, isPinned: boolean): Promise<ActionResult<Note>> {
  return updateNote(id, { is_pinned: isPinned });
}

export async function getNotes(
  filter?: NotesFilterInput
): Promise<ActionResult<PaginatedResult<Note>>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Unauthorized" };

  const parsed = notesFilterSchema.safeParse(filter ?? {});
  if (!parsed.success) {
    return { success: false, error: "Invalid filter parameters" };
  }

  const { search, tags, sortBy, sortOrder, page, pageSize } = parsed.data;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("notes")
    .select("*", { count: "exact" })
    .eq("user_id", user.id);

  if (search) {
    query = query.textSearch("content", search, { type: "websearch", config: "english" });
  }

  if (tags && tags.length > 0) {
    query = query.overlaps("tags", tags);
  }

  query = query.order(sortBy, { ascending: sortOrder === "asc" }).range(from, to);

  const { data, count, error } = await query;

  if (error) return { success: false, error: error.message };

  return {
    success: true,
    data: {
      data: data ?? [],
      total: count ?? 0,
      page,
      pageSize,
      hasMore: (count ?? 0) > to + 1,
    },
  };
}
