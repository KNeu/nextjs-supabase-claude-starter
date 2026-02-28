import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, XCircle, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateStripeCustomer, createCheckoutSession, createPortalSession } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isPaidUser } from "@/types";

export const metadata: Metadata = { title: "Billing" };

// Server Actions for Stripe redirects
async function startCheckout() {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("email, stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const customerId = await getOrCreateStripeCustomer(
    user.id,
    profile.email,
    profile.stripe_customer_id
  );

  // Persist customer ID if newly created
  if (!profile.stripe_customer_id) {
    await adminClient
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const session = await createCheckoutSession({
    customerId,
    priceId: env.STRIPE_PRO_PRICE_ID ?? "",
    userId: user.id,
    appUrl: env.NEXT_PUBLIC_APP_URL,
  });

  if (session.url) redirect(session.url);
}

async function openPortal() {
  "use server";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) redirect("/billing");

  const session = await createPortalSession(
    profile.stripe_customer_id,
    env.NEXT_PUBLIC_APP_URL
  );
  redirect(session.url);
}

const FREE_FEATURES = [
  { label: "50 messages / month", included: true },
  { label: "All Claude tools", included: true },
  { label: "Note creation via chat", included: true },
  { label: "Unlimited conversations", included: false },
  { label: "Priority support", included: false },
];

const PRO_FEATURES = [
  { label: "Unlimited messages", included: true },
  { label: "All Claude tools", included: true },
  { label: "Note creation via chat", included: true },
  { label: "Unlimited conversations", included: true },
  { label: "Priority support", included: true },
];

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  const paid = profile ? isPaidUser(profile) : false;

  // Usage this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count: messageCount } = await supabase
    .from("usage_tracking")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user!.id)
    .gte("created_at", startOfMonth.toISOString());

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Billing</h1>
        {params.success === "true" && (
          <p className="mt-1 text-sm text-green-600">
            Subscription activated! You now have unlimited messages.
          </p>
        )}
        {params.canceled === "true" && (
          <p className="mt-1 text-sm text-muted-foreground">
            Checkout was canceled. Your plan was not changed.
          </p>
        )}
      </div>

      {/* Usage summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">This month</CardTitle>
          <CardDescription>
            {paid
              ? "You have unlimited messages on the Pro plan."
              : `${messageCount ?? 0} of ${env.FREE_TIER_MONTHLY_MESSAGE_LIMIT} free messages used.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge variant={paid ? "default" : "secondary"}>
              {paid ? "Pro" : "Free tier"}
            </Badge>
            {profile?.subscription_period_end && paid && (
              <span className="text-xs text-muted-foreground">
                Renews {new Date(profile.subscription_period_end).toLocaleDateString()}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Plans */}
      {!paid && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Free</CardTitle>
              <div className="text-2xl font-bold">$0</div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {FREE_FEATURES.map(({ label, included }) => (
                  <li key={label} className="flex items-center gap-2 text-sm">
                    {included ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                    )}
                    <span className={included ? "" : "text-muted-foreground"}>{label}</span>
                  </li>
                ))}
              </ul>
              <Badge className="mt-4" variant="secondary">Current plan</Badge>
            </CardContent>
          </Card>

          <Card className="border-primary">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Pro</CardTitle>
                <Badge>
                  <Zap className="mr-1 h-3 w-3" />
                  Upgrade
                </Badge>
              </div>
              <div className="text-2xl font-bold">$20<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {PRO_FEATURES.map(({ label, included }) => (
                  <li key={label} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className={`h-4 w-4 shrink-0 ${included ? "text-green-500" : "text-muted-foreground/50"}`} />
                    {label}
                  </li>
                ))}
              </ul>
              <form action={startCheckout}>
                <Button type="submit" className="mt-4 w-full" disabled={!env.STRIPE_PRO_PRICE_ID}>
                  Upgrade to Pro
                </Button>
              </form>
              {!env.STRIPE_PRO_PRICE_ID && (
                <p className="mt-2 text-xs text-muted-foreground text-center">
                  Add STRIPE_PRO_PRICE_ID to enable billing
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Manage subscription */}
      {paid && profile?.stripe_customer_id && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Manage subscription</CardTitle>
            <CardDescription>
              Update payment method, download invoices, or cancel your subscription.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={openPortal}>
              <Button type="submit" variant="outline">
                Open customer portal →
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
