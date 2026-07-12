"use client";

import { useEffect, useState } from "react";
import { WorklogEntry } from "@/lib/types";
import MarkdownContent from "./MarkdownContent";

export default function WorklogTab({ projectId }: { projectId: string }) {
  const [entries, setEntries] = useState<WorklogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");

  async function load() {
    const res = await fetch(`/api/projects/${projectId}/worklog?limit=100`);
    setEntries(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: initial load, see Coding-Conventions "Kein optimistic UI"
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    await fetch(`/api/projects/${projectId}/worklog`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    setContent("");
    load();
  }

  async function remove(id: number) {
    if (!confirm("Worklog-Eintrag löschen?")) return;
    await fetch(`/api/worklog/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={create} className="rounded-lg border border-neutral-200 bg-white p-4">
        <h3 className="mb-1 text-sm font-medium text-neutral-700">Neuer Worklog-Eintrag</h3>
        <p className="mb-3 text-xs text-neutral-500">
          Kompakter Session-Stand (erledigt / offen / nächster Schritt). Wird von Claude am
          Session-Ende geschrieben und am Anfang der nächsten Session gelesen — Einträge sind
          Schnappschüsse und nachträglich nicht editierbar.
        </p>
        <div className="flex flex-col gap-3">
          <textarea
            className="rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
            placeholder="Markdown, z.B.: Erledigt: Req #41 umgesetzt. Offen: #42. Nächster Schritt: ..."
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <button
            type="submit"
            className="self-start rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Hinzufügen
          </button>
        </div>
      </form>

      <div className="flex flex-col gap-3">
        {loading && <p className="text-sm text-neutral-500">Lade...</p>}
        {!loading && entries.length === 0 && (
          <p className="text-sm text-neutral-500">Noch keine Worklog-Einträge.</p>
        )}
        {entries.map((entry) => (
          <div key={entry.id} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="text-xs text-neutral-400">{entry.created_at}</div>
              <button
                onClick={() => remove(entry.id)}
                className="shrink-0 text-xs text-neutral-400 hover:text-red-600"
              >
                Löschen
              </button>
            </div>
            <div className="mt-2">
              <MarkdownContent content={entry.content} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
