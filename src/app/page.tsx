import Link from "next/link";
import { ArrowRight, MessageSquare, FileText, Zap, Shield, CreditCard, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    icon: MessageSquare,
    title: "AI Chat with Streaming",
    description:
      "Real-time streaming responses from Claude. Tool use, conversation history, and per-conversation system prompts.",
  },
  {
    icon: Shield,
    title: "Auth & Row Level Security",
    description:
      "Supabase Auth with email/password and Google OAuth. Every database table has RLS policies.",
  },
  {
    icon: FileText,
    title: "Full CRUD Pattern",
    description:
      "Notes with search, pagination, tags, and optimistic updates. The template for any new resource.",
  },
  {
    icon: CreditCard,
    title: "Stripe Billing",
    description:
      "Checkout, webhooks, customer portal. Free tier vs. paid tier with monthly usage limits.",
  },
  {
    icon: Zap,
    title: "Rate Limiting",
    description:
      "IP-based per-minute limits and per-user monthly message quotas with subscription tier logic.",
  },
  {
    icon: Code,
    title: "Production Patterns",
    description:
      "TypeScript strict mode, Zod validation, env var validation, clean migrations, and zero hardcoded secrets.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b max-w-6xl mx-auto">
        <span className="font-semibold">nextjs-supabase-claude-starter</span>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/register">Get started</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-20 pb-16 text-center">
        <Badge variant="secondary" className="mb-4">
          Open Source • MIT License
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Build AI SaaS
          <br />
          <span className="text-muted-foreground">without the boilerplate</span>
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
          A production-grade starter template with auth, AI chat, CRUD patterns, billing, and real
          database migrations. Clone and ship in under 10 minutes.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/register">
              Start building <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a
              href="https://github.com/KNeu/nextjs-supabase-claude-starter"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub
            </a>
          </Button>
        </div>
      </section>

      {/* Stack */}
      <section className="border-y bg-muted/50 py-6">
        <div className="mx-auto max-w-4xl px-6">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-medium text-muted-foreground">
            {["Next.js 15", "Supabase", "Claude API", "TypeScript", "Tailwind CSS", "Stripe", "shadcn/ui"].map(
              (tech) => (
                <span key={tech}>{tech}</span>
              )
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-center text-2xl font-bold mb-12">Everything you need to ship</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-lg border bg-card p-6">
              <Icon className="h-8 w-8 mb-3 text-primary" />
              <h3 className="font-semibold mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>
          Built by{" "}
          <a
            href="https://www.upwork.com/freelancers/kevinneuburger"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Kevin Neuburger
          </a>{" "}
          · MIT License
        </p>
      </footer>
    </main>
  );
}
