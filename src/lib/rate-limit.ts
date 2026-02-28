// =============================================================================
// Rate Limiting
// =============================================================================
// Simple in-memory rate limiter for the chat endpoint.
// For production with multiple server instances, replace with Redis
// (e.g., @upstash/ratelimit) or Vercel's built-in rate limiting.
//
// Two tiers:
//   1. IP-based: prevents abuse from unauthenticated or rapid requests
//   2. User-based: enforces monthly message limits per subscription tier
// =============================================================================

import { env } from "@/lib/env";

// ---------------------------------------------------------------------------
// IP-based rate limiting (per minute, in-memory)
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const ipRateLimitMap = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of ipRateLimitMap.entries()) {
    if (entry.resetAt < now) {
      ipRateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check and increment the rate limit for an IP address.
 * Returns whether the request is allowed and remaining quota.
 */
export function checkIpRateLimit(ip: string): RateLimitResult {
  const limit = env.CHAT_RATE_LIMIT_PER_MINUTE;
  const windowMs = 60 * 1000; // 1 minute
  const now = Date.now();

  const entry = ipRateLimitMap.get(ip);

  if (!entry || entry.resetAt < now) {
    ipRateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

// ---------------------------------------------------------------------------
// User-based monthly message limit
// ---------------------------------------------------------------------------

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export interface MonthlyLimitResult {
  allowed: boolean;
  used: number;
  limit: number;
  isPaid: boolean;
}

/**
 * Check whether a user has exceeded their monthly message limit.
 * Paid users have no limit (returns allowed: true immediately).
 */
export async function checkMonthlyMessageLimit(
  supabase: SupabaseClient<Database>,
  userId: string,
  subscriptionStatus: string
): Promise<MonthlyLimitResult> {
  const isPaid = subscriptionStatus === "active" || subscriptionStatus === "trialing";

  if (isPaid) {
    return { allowed: true, used: 0, limit: Infinity, isPaid: true };
  }

  const freeLimit = env.FREE_TIER_MONTHLY_MESSAGE_LIMIT;
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("usage_tracking")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startOfMonth.toISOString());

  if (error) {
    // On error, allow the request — fail open to avoid blocking legitimate users
    return { allowed: true, used: 0, limit: freeLimit, isPaid: false };
  }

  const used = count ?? 0;
  return {
    allowed: used < freeLimit,
    used,
    limit: freeLimit,
    isPaid: false,
  };
}
