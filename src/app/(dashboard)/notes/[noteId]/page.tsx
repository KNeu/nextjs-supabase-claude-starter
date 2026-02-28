import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NoteForm } from "@/components/notes/note-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelativeDate } from "@/lib/utils";

interface Props {
  params: Promise<{ noteId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { noteId } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("notes").select("title").eq("id", noteId).single();
  return { title: data?.title ?? "Note" };
}

export default async function NotePage({ params }: Props) {
  const { noteId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: note } = await supabase
    .from("notes")
    .select("*")
    .eq("id", noteId)
    .eq("user_id", user!.id)
    .single();

  if (!note) notFound();

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/notes">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Notes
          </Link>
        </Button>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>Last updated {formatRelativeDate(note.updated_at)}</span>
          {note.tags.length > 0 && (
            <div className="flex gap-1">
              {note.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
      <NoteForm note={note} />
    </div>
  );
}
