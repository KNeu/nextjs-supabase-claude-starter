// =============================================================================
// Anthropic Client
// =============================================================================
// Singleton Anthropic SDK instance for server-side use only.
// Never import this in Client Components.
// =============================================================================

import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";

if (!env.ANTHROPIC_API_KEY) {
  console.warn("ANTHROPIC_API_KEY is not set — AI features will not work");
}

export const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY ?? "",
});

export const DEFAULT_MODEL = env.ANTHROPIC_MODEL;
export const DEFAULT_MAX_TOKENS = env.ANTHROPIC_MAX_TOKENS;

export const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI assistant. You have access to tools that let you query the user's data and take actions on their behalf.

Guidelines:
- Be concise and direct in your responses
- Use tools when they would provide useful, real-time information
- Always explain what you're doing when using tools
- Format responses with markdown when it aids readability`;
