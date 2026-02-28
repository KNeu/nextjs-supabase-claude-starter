// =============================================================================
// Application Types
// =============================================================================
// Derived types and domain models used throughout the app.
// =============================================================================

import type { Database } from "./database.types";

// ---------------------------------------------------------------------------
// Database row aliases (shorthand for commonly used types)
// ---------------------------------------------------------------------------
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type Note = Database["public"]["Tables"]["notes"]["Row"];
export type UsageTracking = Database["public"]["Tables"]["usage_tracking"]["Row"];
export type MonthlyUsage = Database["public"]["Views"]["monthly_usage"]["Row"];

// Insert / Update aliases
export type ConversationInsert = Database["public"]["Tables"]["conversations"]["Insert"];
export type MessageInsert = Database["public"]["Tables"]["messages"]["Insert"];
export type NoteInsert = Database["public"]["Tables"]["notes"]["Insert"];
export type NoteUpdate = Database["public"]["Tables"]["notes"]["Update"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

// ---------------------------------------------------------------------------
// Subscription tiers
// ---------------------------------------------------------------------------
export type SubscriptionStatus = Profile["subscription_status"];

export function isPaidUser(profile: Profile): boolean {
  return profile.subscription_status === "active" || profile.subscription_status === "trialing";
}

// ---------------------------------------------------------------------------
// API response envelope
// ---------------------------------------------------------------------------
export type ApiSuccess<T> = { success: true; data: T };
export type ApiError = { success: false; error: string; code?: string };
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ---------------------------------------------------------------------------
// Chat / AI types
// ---------------------------------------------------------------------------
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StreamChunk {
  type: "text" | "tool_use" | "error" | "done";
  content?: string;
  toolName?: string;
  toolResult?: unknown;
  inputTokens?: number;
  outputTokens?: number;
}

// ---------------------------------------------------------------------------
// Notes filters
// ---------------------------------------------------------------------------
export interface NotesFilter {
  search?: string;
  tags?: string[];
  sortBy?: "updated_at" | "created_at" | "title";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ---------------------------------------------------------------------------
// Server Action result
// (Matches the shape expected by useFormState)
// ---------------------------------------------------------------------------
export type ActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };
