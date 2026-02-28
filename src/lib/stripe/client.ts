// =============================================================================
// Stripe Client — Server-Side Only
// =============================================================================

import Stripe from "stripe";
import { env } from "@/lib/env";

if (!env.STRIPE_SECRET_KEY) {
  console.warn("STRIPE_SECRET_KEY is not set — billing features will not work");
}

export const stripe = new Stripe(env.STRIPE_SECRET_KEY ?? "sk_test_placeholder", {
  apiVersion: "2025-01-27.acacia",
  typescript: true,
});

// ---------------------------------------------------------------------------
// Helper: create or retrieve a Stripe customer for a user
// ---------------------------------------------------------------------------
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  existingCustomerId?: string | null
): Promise<string> {
  if (existingCustomerId) {
    return existingCustomerId;
  }

  const customer = await stripe.customers.create({
    email,
    metadata: { supabase_user_id: userId },
  });

  return customer.id;
}

// ---------------------------------------------------------------------------
// Helper: create a Checkout Session for upgrading to Pro
// ---------------------------------------------------------------------------
export async function createCheckoutSession({
  customerId,
  priceId,
  userId,
  appUrl,
}: {
  customerId: string;
  priceId: string;
  userId: string;
  appUrl: string;
}): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    success_url: `${appUrl}/billing?success=true`,
    cancel_url: `${appUrl}/billing?canceled=true`,
    metadata: { supabase_user_id: userId },
    subscription_data: {
      metadata: { supabase_user_id: userId },
    },
  });
}

// ---------------------------------------------------------------------------
// Helper: create a Customer Portal session for managing subscriptions
// ---------------------------------------------------------------------------
export async function createPortalSession(
  customerId: string,
  appUrl: string
): Promise<Stripe.BillingPortal.Session> {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/billing`,
  });
}
