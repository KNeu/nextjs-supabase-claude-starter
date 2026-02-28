// =============================================================================
// Claude Tool Definitions
// =============================================================================
// Demonstrates two categories of tools:
//   1. Query tools — read data (get_usage_stats, search_notes)
//   2. Action tools — write data (create_note)
//
// Each tool definition follows the Anthropic API spec.
// Tool handlers are co-located with the definitions for clarity.
// =============================================================================

import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export type ToolName = "get_usage_stats" | "search_notes" | "create_note";

export interface ToolContext {
  supabase: SupabaseClient<Database>;
  userId: string;
}

// ---------------------------------------------------------------------------
// Tool Definitions (passed to the Anthropic API)
// ---------------------------------------------------------------------------
export const toolDefinitions: Anthropic.Tool[] = [
  {
    name: "get_usage_stats",
    description:
      "Get the user's AI usage statistics for the current month, including message count, token usage, and estimated cost. Use this when the user asks about their usage, limits, or remaining messages.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "search_notes",
    description:
      "Search through the user's notes by keyword. Returns matching note titles and previews. Use this when the user asks to find or look up notes.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "The search term to find in note titles and content",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "create_note",
    description:
      "Create a new note for the user with a title and content. Use this when the user asks to save, write down, or create a note. Always confirm the content with the user before creating.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "A short, descriptive title for the note",
        },
        content: {
          type: "string",
          description: "The full content of the note (supports markdown)",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Optional tags to categorize the note",
        },
      },
      required: ["title", "content"],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool Handlers
// ---------------------------------------------------------------------------

interface GetUsageStatsInput {
  // No inputs required
}

interface SearchNotesInput {
  query: string;
}

interface CreateNoteInput {
  title: string;
  content: string;
  tags?: string[];
}

type ToolInput = GetUsageStatsInput | SearchNotesInput | CreateNoteInput;

export async function executeTool(
  toolName: ToolName,
  toolInput: ToolInput,
  ctx: ToolContext
): Promise<string> {
  switch (toolName) {
    case "get_usage_stats":
      return handleGetUsageStats(ctx);

    case "search_notes":
      return handleSearchNotes(toolInput as SearchNotesInput, ctx);

    case "create_note":
      return handleCreateNote(toolInput as CreateNoteInput, ctx);

    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

async function handleGetUsageStats(ctx: ToolContext): Promise<string> {
  const { supabase, userId } = ctx;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data, error } = await supabase
    .from("usage_tracking")
    .select("input_tokens, output_tokens, estimated_cost_cents")
    .eq("user_id", userId)
    .gte("created_at", startOfMonth);

  if (error) {
    return JSON.stringify({ error: "Failed to fetch usage stats" });
  }

  const messageCount = data.length;
  const totalInputTokens = data.reduce((sum, row) => sum + row.input_tokens, 0);
  const totalOutputTokens = data.reduce((sum, row) => sum + row.output_tokens, 0);
  const totalCostCents = data.reduce((sum, row) => sum + Number(row.estimated_cost_cents), 0);

  return JSON.stringify({
    month: now.toLocaleString("en-US", { month: "long", year: "numeric" }),
    message_count: messageCount,
    total_input_tokens: totalInputTokens,
    total_output_tokens: totalOutputTokens,
    estimated_cost_usd: (totalCostCents / 100).toFixed(4),
  });
}

async function handleSearchNotes(input: SearchNotesInput, ctx: ToolContext): Promise<string> {
  const { supabase, userId } = ctx;

  const { data, error } = await supabase
    .from("notes")
    .select("id, title, content, tags, updated_at")
    .eq("user_id", userId)
    .textSearch("content", input.query, {
      type: "websearch",
      config: "english",
    })
    .limit(5);

  if (error) {
    return JSON.stringify({ error: "Failed to search notes" });
  }

  if (!data || data.length === 0) {
    return JSON.stringify({ results: [], message: `No notes found matching "${input.query}"` });
  }

  const results = data.map((note) => ({
    id: note.id,
    title: note.title,
    preview: note.content.slice(0, 200) + (note.content.length > 200 ? "…" : ""),
    tags: note.tags,
    updated_at: note.updated_at,
  }));

  return JSON.stringify({ results, total: results.length });
}

async function handleCreateNote(input: CreateNoteInput, ctx: ToolContext): Promise<string> {
  const { supabase, userId } = ctx;

  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: userId,
      title: input.title,
      content: input.content,
      tags: input.tags ?? [],
    })
    .select("id, title")
    .single();

  if (error) {
    return JSON.stringify({ error: "Failed to create note", details: error.message });
  }

  return JSON.stringify({
    success: true,
    note_id: data.id,
    message: `Note "${data.title}" created successfully`,
  });
}
