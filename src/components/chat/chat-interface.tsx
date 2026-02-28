"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage, TypingIndicator } from "@/components/chat/message";
import { ChatInput } from "@/components/chat/chat-input";
import { useToast } from "@/hooks/use-toast";
import type { Message } from "@/types";

type DisplayMessage = Pick<Message, "role" | "content" | "tool_name">;

interface ChatInterfaceProps {
  conversationId: string;
  initialMessages: Message[];
  systemPrompt?: string | null;
}

export function ChatInterface({
  conversationId,
  initialMessages,
  systemPrompt,
}: ChatInterfaceProps) {
  const { toast } = useToast();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<DisplayMessage[]>(
    initialMessages.map((m) => ({ role: m.role, content: m.content, tool_name: m.tool_name }))
  );
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  const sendMessage = async (content: string) => {
    if (isStreaming) return;

    // Optimistically add user message
    const userMsg: DisplayMessage = { role: "user", content, tool_name: null };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    setStreamingContent("");

    let accumulated = "";

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, content, systemPrompt }),
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string; code?: string };
        if (error.code === "MONTHLY_LIMIT_REACHED") {
          toast({
            variant: "destructive",
            title: "Message limit reached",
            description: error.error ?? "Upgrade to Pro for unlimited messages.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Error",
            description: error.error ?? "Something went wrong",
          });
        }
        // Remove the optimistic user message on failure
        setMessages((prev) => prev.slice(0, -1));
        setIsStreaming(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const rawData = line.slice(6).trim();
          if (!rawData) continue;

          try {
            const chunk = JSON.parse(rawData) as {
              type: string;
              content?: string;
              toolName?: string;
            };

            if (chunk.type === "text" && chunk.content) {
              accumulated += chunk.content;
              setStreamingContent(accumulated);
            }

            if (chunk.type === "tool_start" && chunk.toolName) {
              accumulated += `\n[Using tool: ${chunk.toolName}…]\n`;
              setStreamingContent(accumulated);
            }

            if (chunk.type === "done") {
              // Commit the final assistant message
              setMessages((prev) => [
                ...prev,
                { role: "assistant", content: accumulated, tool_name: null },
              ]);
              setStreamingContent("");
              setIsStreaming(false);
              accumulated = "";
            }

            if (chunk.type === "error") {
              toast({
                variant: "destructive",
                title: "AI error",
                description: chunk.content ?? "An error occurred",
              });
              setIsStreaming(false);
              setStreamingContent("");
            }
          } catch {
            // Ignore JSON parse errors in the SSE stream
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Network error";
      toast({ variant: "destructive", title: "Connection error", description: message });
      setIsStreaming(false);
      setStreamingContent("");
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl py-4">
          {messages.length === 0 && !isStreaming && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-lg font-medium">What would you like to explore?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ask anything, or try &quot;Create a note about X&quot; or &quot;What&apos;s my
                usage this month?&quot;
              </p>
            </div>
          )}
          {messages.map((message, i) => (
            <ChatMessage key={i} message={message} />
          ))}
          {isStreaming && streamingContent && (
            <ChatMessage
              message={{ role: "assistant", content: streamingContent, tool_name: null }}
            />
          )}
          {isStreaming && !streamingContent && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t bg-background px-4 py-3">
        <div className="mx-auto max-w-3xl">
          <ChatInput onSend={sendMessage} isLoading={isStreaming} />
        </div>
      </div>
    </div>
  );
}
