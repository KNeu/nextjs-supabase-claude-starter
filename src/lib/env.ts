// =============================================================================
// Environment Variable Validation
// =============================================================================
// Validates required env vars at startup. The app throws immediately if any
// required variable is missing, rather than failing silently at runtime.
//
// Usage: import { env } from "@/lib/env"
// =============================================================================

import { z } from "zod";

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required").optional(),

  // Anthropic
  ANTHROPIC_API_KEY: z.string().startsWith("sk-ant-", "ANTHROPIC_API_KEY must start with sk-ant-").optional(),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-20250514"),
  ANTHROPIC_MAX_TOKENS: z.coerce.number().int().positive().default(4096),

  // Stripe
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRO_PRICE_ID: z.string().optional(),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  FREE_TIER_MONTHLY_MESSAGE_LIMIT: z.coerce.number().int().positive().default(50),
  CHAT_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(10),

  // Node
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

// Merge process.env with NEXT_PUBLIC_ vars (available on the client too)
const _parsed = envSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env["NEXT_PUBLIC_SUPABASE_URL"],
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"],
  SUPABASE_SERVICE_ROLE_KEY: process.env["SUPABASE_SERVICE_ROLE_KEY"],
  ANTHROPIC_API_KEY: process.env["ANTHROPIC_API_KEY"],
  ANTHROPIC_MODEL: process.env["ANTHROPIC_MODEL"],
  ANTHROPIC_MAX_TOKENS: process.env["ANTHROPIC_MAX_TOKENS"],
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"],
  STRIPE_SECRET_KEY: process.env["STRIPE_SECRET_KEY"],
  STRIPE_WEBHOOK_SECRET: process.env["STRIPE_WEBHOOK_SECRET"],
  STRIPE_PRO_PRICE_ID: process.env["STRIPE_PRO_PRICE_ID"],
  NEXT_PUBLIC_APP_URL: process.env["NEXT_PUBLIC_APP_URL"],
  FREE_TIER_MONTHLY_MESSAGE_LIMIT: process.env["FREE_TIER_MONTHLY_MESSAGE_LIMIT"],
  CHAT_RATE_LIMIT_PER_MINUTE: process.env["CHAT_RATE_LIMIT_PER_MINUTE"],
  NODE_ENV: process.env["NODE_ENV"],
});

if (!_parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(
    JSON.stringify(
      _parsed.error.flatten().fieldErrors,
      null,
      2
    )
  );
  // Only throw in production or when explicitly enabled — during local dev
  // you might have a partial .env.local while setting up
  if (process.env["NODE_ENV"] === "production") {
    throw new Error("Invalid environment variables. Check server logs.");
  }
}

export const env = _parsed.success
  ? _parsed.data
  : ({
      NEXT_PUBLIC_SUPABASE_URL: process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? "",
      SUPABASE_SERVICE_ROLE_KEY: process.env["SUPABASE_SERVICE_ROLE_KEY"],
      ANTHROPIC_API_KEY: process.env["ANTHROPIC_API_KEY"],
      ANTHROPIC_MODEL: process.env["ANTHROPIC_MODEL"] ?? "claude-sonnet-4-20250514",
      ANTHROPIC_MAX_TOKENS: 4096,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"],
      STRIPE_SECRET_KEY: process.env["STRIPE_SECRET_KEY"],
      STRIPE_WEBHOOK_SECRET: process.env["STRIPE_WEBHOOK_SECRET"],
      STRIPE_PRO_PRICE_ID: process.env["STRIPE_PRO_PRICE_ID"],
      NEXT_PUBLIC_APP_URL: process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000",
      FREE_TIER_MONTHLY_MESSAGE_LIMIT: 50,
      CHAT_RATE_LIMIT_PER_MINUTE: 10,
      NODE_ENV: (process.env["NODE_ENV"] as "development" | "test" | "production") ?? "development",
    });
