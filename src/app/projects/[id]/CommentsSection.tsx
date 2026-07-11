"use client";

import { useEffect, useState } from "react";
import { Comment } from "@/lib/types";

export default function CommentsSection({ requirementId }: { requirementId: number }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState("");

  async function load() {
    const res = await fetch(`/api/requirements/${requirementId}/comments`);
    setComments(await res.json());
    setLoaded(true);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requirementId]);

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await fetch(`/api/requirements/${requirementId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text }),
    });
    setText("");
    load();
  }

  async function remove(id: number) {
    await fetch(`/api/comments/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="mt-3 border-t border-neutral-100 pt-3">
      <div className="flex flex-col gap-2">
        {!loaded && <p className="text-xs text-neutral-400">Lade Kommentare...</p>}
        {loaded && comments.length === 0 && (
          <p className="text-xs text-neutral-400">Noch keine Kommentare.</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="flex items-start justify-between gap-2 text-sm">
            <div>
              <span className="whitespace-pre-wrap text-neutral-700">{c.content}</span>
              <span className="ml-2 text-xs text-neutral-400">{c.created_at}</span>
            </div>
            <button
              onClick={() => remove(c.id)}
              className="shrink-0 text-xs text-neutral-400 hover:text-red-600"
            >
              Löschen
            </button>
          </div>
        ))}
      </div>
      <form onSubmit={addComment} className="mt-2 flex gap-2">
        <input
          className="flex-1 rounded-md border border-neutral-300 px-2 py-1 text-sm"
          placeholder="Kommentar hinzufügen..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          type="submit"
          className="rounded-md border border-neutral-300 px-3 py-1 text-xs hover:bg-neutral-50"
        >
          Senden
        </button>
      </form>
    </div>
  );
}
