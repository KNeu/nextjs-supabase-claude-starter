import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ConversationList } from "@/components/chat/conversation-list";
import { ChatInterface } from "@/components/chat/chat-interface";

interface Props {
  params: Promise<{ conversationId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { conversationId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversations")
    .select("title")
    .eq("id", conversationId)
    .single();
  return { title: data?.title ?? "Chat" };
}

export default async function ConversationPage({ params }: Props) {
  const { conversationId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: conversation }, { data: messages }, { data: conversations }] = await Promise.all([
    supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .eq("user_id", user!.id)
      .single(),
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true }),
    supabase
      .from("conversations")
      .select("*")
      .eq("user_id", user!.id)
      .order("updated_at", { ascending: false })
      .limit(100),
  ]);

  if (!conversation) notFound();

  return (
    <div className="flex h-full">
      <div className="w-64 shrink-0">
        <ConversationList conversations={conversations ?? []} />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <ChatInterface
          conversationId={conversationId}
          initialMessages={messages ?? []}
          systemPrompt={conversation.system_prompt}
        />
      </div>
    </div>
  );
}
