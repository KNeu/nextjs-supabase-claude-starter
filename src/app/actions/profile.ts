"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateProfileSchema, type UpdateProfileInput } from "@/lib/validations/auth";
import type { ActionResult, Profile } from "@/types";

export async function updateProfile(input: UpdateProfileInput): Promise<ActionResult<Profile>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Unauthorized" };

  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Validation error" };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", user.id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/profile");
  return { success: true, data };
}

export async function uploadAvatar(formData: FormData): Promise<ActionResult<{ url: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Unauthorized" };

  const file = formData.get("avatar") as File | null;
  if (!file) return { success: false, error: "No file provided" };

  if (file.size > 2 * 1024 * 1024) {
    return { success: false, error: "File too large (max 2 MB)" };
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: "File type not allowed. Use JPEG, PNG, WebP, or GIF." };
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${user.id}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return { success: false, error: uploadError.message };

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);

  // Update the profile with the new avatar URL
  const updateResult = await updateProfile({ avatar_url: publicUrl });
  if (!updateResult.success) return { success: false, error: updateResult.error };

  revalidatePath("/profile");
  return { success: true, data: { url: publicUrl } };
}
