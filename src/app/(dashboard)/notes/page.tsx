import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Pin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelativeDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Notes" };

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; tag?: string; page?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const page = Math.max(1, parseInt(params.page ?? "1"));
  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("notes")
    .select("*", { count: "exact" })
    .eq("user_id", user!.id)
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (params.search) {
    query = query.textSearch("content", params.search, { type: "websearch", config: "english" });
  }

  if (params.tag) {
    query = query.contains("tags", [params.tag]);
  }

  const { data: notes, count } = await query;
  const total = count ?? 0;
  const hasMore = total > to + 1;

  return (
    <div className="flex h-full flex-col overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold">Notes</h1>
          <p className="text-sm text-muted-foreground">{total} note{total !== 1 ? "s" : ""}</p>
        </div>
        <Button asChild size="sm">
          <Link href="/notes/new">
            <Plus className="mr-2 h-4 w-4" />
            New note
          </Link>
        </Button>
      </div>

      {/* Notes grid */}
      <div className="flex-1 p-6">
        {!notes || notes.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-muted-foreground">
              {params.search ? `No notes matching "${params.search}"` : "No notes yet"}
            </p>
            <Button asChild size="sm" className="mt-3">
              <Link href="/notes/new">Create your first note</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {notes.map((note) => (
              <Link key={note.id} href={`/notes/${note.id}`}>
                <article className="group h-full rounded-lg border bg-card p-4 transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium line-clamp-2 group-hover:text-primary">
                      {note.title}
                    </h3>
                    {note.is_pinned && (
                      <Pin className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    )}
                  </div>
                  {note.content && (
                    <p className="mt-1.5 text-sm text-muted-foreground line-clamp-3">
                      {note.content}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {note.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatRelativeDate(note.updated_at)}
                  </p>
                </article>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {(page > 1 || hasMore) && (
          <div className="mt-6 flex justify-center gap-2">
            {page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/notes?page=${page - 1}`}>Previous</Link>
              </Button>
            )}
            {hasMore && (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/notes?page=${page + 1}`}>Next</Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
