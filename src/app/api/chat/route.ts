// =============================================================================
// Chat API Route — Streaming
// =============================================================================
// POST /api/chat
//
// Accepts a message, streams a Claude response, saves both to the DB,
// and tracks token usage.
//
// Middleware chain: auth → IP rate limit → monthly limit → validate → stream
// =============================================================================

import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { sendMessageSchema } from "@/lib/validations/chat";
import { checkIpRateLimit, checkMonthlyMessageLimit } from "@/lib/rate-limit";
import { anthropic, DEFAULT_MODEL, DEFAULT_MAX_TOKENS, DEFAULT_SYSTEM_PROMPT } from "@/lib/anthropic/client";
import { toolDefinitions, executeTool, type ToolName } from "@/lib/anthropic/tools";
import { estimateCostCents } from "@/lib/utils";
import { createAdminClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import type Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // ---------------------------------------------------------------------------
  // 1. Auth — verify the user is logged in
  // ---------------------------------------------------------------------------
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ---------------------------------------------------------------------------
  // 2. IP rate limit (per minute)
  // ---------------------------------------------------------------------------
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ipLimit = checkIpRateLimit(ip);

  if (!ipLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((ipLimit.resetAt - Date.now()) / 1000).toString(),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  // ---------------------------------------------------------------------------
  // 3. Fetch profile & check monthly message limit
  // ---------------------------------------------------------------------------
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .single();

  const monthlyLimit = await checkMonthlyMessageLimit(
    supabase,
    user.id,
    profile?.subscription_status ?? "free"
  );

  if (!monthlyLimit.allowed) {
    return NextResponse.json(
      {
        error: `Monthly message limit reached (${monthlyLimit.used}/${monthlyLimit.limit}). Upgrade to Pro for unlimited messages.`,
        code: "MONTHLY_LIMIT_REACHED",
      },
      { status: 429 }
    );
  }

  // ---------------------------------------------------------------------------
  // 4. Parse & validate input
  // ---------------------------------------------------------------------------
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { conversationId, content, systemPrompt } = parsed.data;

  // ---------------------------------------------------------------------------
  // 5. Verify conversation ownership & fetch message history
  // ---------------------------------------------------------------------------
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, system_prompt")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .single();

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const { data: previousMessages } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(50); // Cap context window to last 50 messages

  // ---------------------------------------------------------------------------
  // 6. Save the user's message
  // ---------------------------------------------------------------------------
  const { data: userMessage } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: "user",
      content,
    })
    .select("id")
    .single();

  // ---------------------------------------------------------------------------
  // 7. Build message history for Claude
  // ---------------------------------------------------------------------------
  const messageHistory: Anthropic.MessageParam[] = [
    ...(previousMessages ?? []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content },
  ];

  // ---------------------------------------------------------------------------
  // 8. Stream from Claude with tool use support
  // ---------------------------------------------------------------------------
  const effectiveSystemPrompt =
    systemPrompt ?? conversation.system_prompt ?? DEFAULT_SYSTEM_PROMPT;

  const encoder = new TextEncoder();
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let assistantContent = "";

  const stream = new ReadableStream({
    async start(controller) {
      const send = (chunk: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      };

      try {
        const anthropicStream = await anthropic.messages.stream({
          model: DEFAULT_MODEL,
          max_tokens: DEFAULT_MAX_TOKENS,
          system: effectiveSystemPrompt,
          messages: messageHistory,
          tools: toolDefinitions,
        });

        for await (const event of anthropicStream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            const text = event.delta.text;
            assistantContent += text;
            send({ type: "text", content: text });
          }

          if (event.type === "message_delta" && event.usage) {
            totalOutputTokens = event.usage.output_tokens;
          }

          if (event.type === "message_start" && event.message.usage) {
            totalInputTokens = event.message.usage.input_tokens;
          }

          // Handle tool use
          if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
            const toolName = event.content_block.name as ToolName;
            send({ type: "tool_start", toolName });

            // Collect full tool input before executing
            let toolInputJson = "";
            for await (const toolEvent of anthropicStream) {
              if (
                toolEvent.type === "content_block_delta" &&
                toolEvent.delta.type === "input_json_delta"
              ) {
                toolInputJson += toolEvent.delta.partial_json;
              }
              if (toolEvent.type === "content_block_stop") break;
            }

            const toolInput = toolInputJson ? (JSON.parse(toolInputJson) as Record<string, unknown>) : {};
            const toolResult = await executeTool(toolName, toolInput as Parameters<typeof executeTool>[1], {
              supabase,
              userId: user.id,
            });

            send({ type: "tool_result", toolName, result: JSON.parse(toolResult) });
            assistantContent += `\n[Used tool: ${toolName}]\nResult: ${toolResult}\n`;
          }
        }

        // Signal completion with token counts
        send({ type: "done", inputTokens: totalInputTokens, outputTokens: totalOutputTokens });
        controller.close();

        // ---------------------------------------------------------------------------
        // 9. Persist assistant message & usage (after stream completes)
        // ---------------------------------------------------------------------------
        const adminClient = createAdminClient();

        const { data: assistantMessage } = await adminClient
          .from("messages")
          .insert({
            conversation_id: conversationId,
            user_id: user.id,
            role: "assistant",
            content: assistantContent,
            input_tokens: totalInputTokens,
            output_tokens: totalOutputTokens,
          })
          .select("id")
          .single();

        const costCents = estimateCostCents(totalInputTokens, totalOutputTokens);

        await adminClient.from("usage_tracking").insert({
          user_id: user.id,
          conversation_id: conversationId,
          message_id: assistantMessage?.id ?? userMessage?.id ?? null,
          model: DEFAULT_MODEL,
          input_tokens: totalInputTokens,
          output_tokens: totalOutputTokens,
          estimated_cost_cents: costCents,
        });

        // Update conversation title from first message if still default
        const titleWords = content.slice(0, 60).trim();
        if (titleWords.length > 0) {
          await adminClient
            .from("conversations")
            .update({ title: titleWords + (content.length > 60 ? "…" : "") })
            .eq("id", conversationId)
            .eq("title", "New conversation");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        send({ type: "error", content: message });
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
