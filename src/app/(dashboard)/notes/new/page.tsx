import type { Metadata } from "next";
import { NoteForm } from "@/components/notes/note-form";

export const metadata: Metadata = { title: "New note" };

export default function NewNotePage() {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-xl font-semibold">New note</h1>
      <NoteForm />
    </div>
  );
}
