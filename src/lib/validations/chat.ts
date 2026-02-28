import { z } from "zod";

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID"),
  content: z
    .string()
    .min(1, "Message cannot be empty")
    .max(32_000, "Message too long (max 32,000 characters)"),
  systemPrompt: z.string().max(8_000, "System prompt too long").optional(),
});

export const createConversationSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title too long")
    .optional(),
  systemPrompt: z.string().max(8_000, "System prompt too long").optional(),
});

export const updateConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  systemPrompt: z.string().max(8_000).nullable().optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
