import { cn } from "@/lib/utils";
import { User, Sparkles, Wrench } from "lucide-react";
import type { Message } from "@/types";

interface ChatMessageProps {
  message: Pick<Message, "role" | "content" | "tool_name">;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isTool = message.role === "tool";

  return (
    <div
      className={cn(
        "flex gap-3 px-4 py-3 animate-fade-in",
        isUser && "flex-row-reverse",
        isTool && "opacity-70"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted",
          isTool && "bg-amber-100 dark:bg-amber-900"
        )}
      >
        {isUser ? (
          <User className="h-3.5 w-3.5" />
        ) : isTool ? (
          <Wrench className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
        ) : (
          <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground",
          isTool && "rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950"
        )}
      >
        {isTool && message.tool_name && (
          <p className="mb-1 text-xs font-medium text-amber-600 dark:text-amber-400">
            Tool: {message.tool_name}
          </p>
        )}
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
      </div>
    </div>
  );
}

/** Streaming placeholder shown while Claude is typing */
export function TypingIndicator() {
  return (
    <div className="flex gap-3 px-4 py-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
        <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex items-center gap-1 rounded-2xl bg-muted px-4 py-3">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
      </div>
    </div>
  );
}
