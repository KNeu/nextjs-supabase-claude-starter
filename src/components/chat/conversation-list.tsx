"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Plus, Search, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { cn, formatRelativeDate, truncate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createConversation, deleteConversation } from "@/app/actions/conversations";
import { useToast } from "@/hooks/use-toast";
import type { Conversation } from "@/types";

interface ConversationListProps {
  conversations: Conversation[];
}

export function ConversationList({ conversations }: ConversationListProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleNew = () => {
    startTransition(async () => {
      const result = await createConversation({});
      if (result.success && result.data) {
        router.push(`/chat/${result.data.id}`);
      } else if (!result.success) {
        toast({ variant: "destructive", title: "Error", description: result.error });
      }
    });
  };

  const handleDelete = (e: React.MouseEvent, conversationId: string) => {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      const result = await deleteConversation(conversationId);
      if (!result.success) {
        toast({ variant: "destructive", title: "Error", description: result.error });
      } else {
        if (pathname.includes(conversationId)) {
          router.push("/chat");
        }
      }
    });
  };

  return (
    <div className="flex h-full flex-col border-r bg-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between p-3">
        <span className="text-sm font-medium text-sidebar-foreground">Conversations</span>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={handleNew}
          disabled={isPending}
          title="New conversation"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="h-8 pl-8 text-sm"
          />
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            {search ? "No matches found" : "No conversations yet"}
          </div>
        ) : (
          <div className="space-y-0.5 px-2 pb-2">
            {filtered.map((conversation) => {
              const isActive = pathname === `/chat/${conversation.id}`;
              return (
                <Link key={conversation.id} href={`/chat/${conversation.id}`}>
                  <div
                    className={cn(
                      "group flex items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-accent",
                      isActive && "bg-accent font-medium"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{truncate(conversation.title, 40)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeDate(conversation.updated_at)}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                      onClick={(e) => handleDelete(e, conversation.id)}
                      title="Delete conversation"
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
