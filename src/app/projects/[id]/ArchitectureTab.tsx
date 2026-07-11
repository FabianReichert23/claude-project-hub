"use client";

import { useEffect, useState } from "react";
import { ArchitectureDoc } from "@/lib/types";
import MarkdownContent from "./MarkdownContent";

export default function ArchitectureTab({ projectId }: { projectId: string }) {
  const [docs, setDocs] = useState<ArchitectureDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");

  async function load() {
    const res = await fetch(`/api/projects/${projectId}/architecture`);
    setDocs(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await fetch(`/api/projects/${projectId}/architecture`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    });
    setTitle("");
    setContent("");
    load();
  }

  function startEdit(doc: ArchitectureDoc) {
    setEditingId(doc.id);
    setEditTitle(doc.title);
    setEditContent(doc.content);
  }

  async function saveEdit() {
    if (editingId == null) return;
    await fetch(`/api/architecture/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle, content: editContent }),
    });
    setEditingId(null);
    load();
  }

  async function remove(id: number) {
    if (!confirm("Architektur-Dokument löschen?")) return;
    await fetch(`/api/architecture/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={create} className="rounded-lg border border-neutral-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-medium text-neutral-700">Neues Architektur-Dokument</h3>
        <div className="flex flex-col gap-3">
          <input
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            placeholder="Titel (z.B. 'System-Übersicht', 'Datenmodell')"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
            placeholder="Inhalt (Markdown, unterstützt auch ```mermaid Diagramm-Blöcke)"
            rows={8}
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
        {!loading && docs.length === 0 && (
          <p className="text-sm text-neutral-500">Noch keine Architektur-Dokumente.</p>
        )}
        {docs.map((doc) => (
          <div key={doc.id} className="rounded-lg border border-neutral-200 bg-white p-4">
            {editingId === doc.id ? (
              <div className="flex flex-col gap-3">
                <input
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
                <textarea
                  className="rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
                  rows={10}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveEdit}
                    className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-700"
                  >
                    Speichern
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="font-medium">{doc.title}</div>
                  <div className="flex shrink-0 gap-3 text-xs">
                    <button
                      onClick={() => startEdit(doc)}
                      className="text-neutral-500 hover:text-neutral-900"
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => remove(doc.id)}
                      className="text-neutral-400 hover:text-red-600"
                    >
                      Löschen
                    </button>
                  </div>
                </div>
                <div className="mt-2">
                  <MarkdownContent content={doc.content} />
                </div>
                <div className="mt-2 text-xs text-neutral-400">
                  Zuletzt aktualisiert: {doc.updated_at}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
