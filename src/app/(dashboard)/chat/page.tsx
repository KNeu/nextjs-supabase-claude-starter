import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ConversationList } from "@/components/chat/conversation-list";
import { MessageSquare } from "lucide-react";

export const metadata: Metadata = { title: "Chat" };

export default async function ChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: conversations } = await supabase
    .from("conversations")
    .select("*")
    .eq("user_id", user!.id)
    .order("updated_at", { ascending: false })
    .limit(100);

  return (
    <div className="flex h-full">
      <div className="w-64 shrink-0">
        <ConversationList conversations={conversations ?? []} />
      </div>
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <div className="text-center">
          <MessageSquare className="mx-auto h-10 w-10 opacity-20" />
          <p className="mt-3 text-sm">Select a conversation or start a new one</p>
        </div>
      </div>
    </div>
  );
}
