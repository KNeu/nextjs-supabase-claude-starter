// =============================================================================
// Stripe Webhook Handler
// =============================================================================
// POST /api/webhooks/stripe
//
// Processes Stripe events to keep the database in sync with subscription state.
// Stripe guarantees at-least-once delivery, so handlers must be idempotent.
//
// Setup:
//   1. Add STRIPE_WEBHOOK_SECRET to .env.local
//   2. Local dev: stripe listen --forward-to localhost:3000/api/webhooks/stripe
//   3. Production: register https://yourdomain.com/api/webhooks/stripe in
//      the Stripe Dashboard → Developers → Webhooks
//
// Events handled:
//   - checkout.session.completed      → link Stripe customer to user profile
//   - customer.subscription.updated   → update subscription status
//   - customer.subscription.deleted   → downgrade to free tier
// =============================================================================

import { type NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";

// Stripe requires the raw body for webhook signature verification
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  if (!env.STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json({ error: `Webhook error: ${message}` }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session, supabase);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription, supabase);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription, supabase);
        break;
      }

      // Acknowledge all other events (Stripe requires a 200 response)
      default:
        break;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Failed to handle Stripe event ${event.type}:`, message);
    // Return 500 so Stripe retries the event
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ---------------------------------------------------------------------------
// Event Handlers
// ---------------------------------------------------------------------------

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: SupabaseClient<Database>
) {
  const userId = session.metadata?.["supabase_user_id"];
  if (!userId || !session.customer || !session.subscription) return;

  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer.id;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription.id;

  // Fetch the full subscription to get the period end
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await supabase
    .from("profiles")
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_status: mapStripeStatus(subscription.status),
      subscription_period_end: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
    })
    .eq("id", userId);
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: SupabaseClient<Database>
) {
  const userId = subscription.metadata["supabase_user_id"];
  if (!userId) return;

  await supabase
    .from("profiles")
    .update({
      subscription_status: mapStripeStatus(subscription.status),
      subscription_period_end: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: SupabaseClient<Database>
) {
  await supabase
    .from("profiles")
    .update({
      subscription_status: "free",
      stripe_subscription_id: null,
      subscription_period_end: null,
    })
    .eq("stripe_subscription_id", subscription.id);
}

// Map Stripe subscription status to our internal type
function mapStripeStatus(
  status: Stripe.Subscription.Status
): Database["public"]["Tables"]["profiles"]["Row"]["subscription_status"] {
  const map: Record<string, Database["public"]["Tables"]["profiles"]["Row"]["subscription_status"]> = {
    active: "active",
    canceled: "canceled",
    past_due: "past_due",
    trialing: "trialing",
    incomplete: "free",
    incomplete_expired: "free",
    paused: "free",
    unpaid: "past_due",
  };
  return map[status] ?? "free";
}
