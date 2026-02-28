"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createConversationSchema,
  updateConversationSchema,
  type CreateConversationInput,
  type UpdateConversationInput,
} from "@/lib/validations/chat";
import type { ActionResult, Conversation } from "@/types";

export async function createConversation(
  input: CreateConversationInput
): Promise<ActionResult<Conversation>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Unauthorized" };

  const parsed = createConversationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Validation error" };
  }

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      user_id: user.id,
      title: parsed.data.title ?? "New conversation",
      system_prompt: parsed.data.systemPrompt ?? null,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/chat");
  return { success: true, data };
}

export async function updateConversation(
  id: string,
  input: UpdateConversationInput
): Promise<ActionResult<Conversation>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Unauthorized" };

  const parsed = updateConversationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Validation error" };
  }

  const { data, error } = await supabase
    .from("conversations")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/chat");
  return { success: true, data };
}

export async function deleteConversation(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Unauthorized" };

  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/chat");
  return { success: true };
}
