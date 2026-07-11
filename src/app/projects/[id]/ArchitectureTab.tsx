"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

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

  function toggleExpanded(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const term = search.trim().toLowerCase();
  const filteredDocs = useMemo(() => {
    if (!term) return docs;
    return docs.filter(
      (d) => d.title.toLowerCase().includes(term) || d.content.toLowerCase().includes(term)
    );
  }, [docs, term]);

  function isOpen(doc: ArchitectureDoc) {
    if (editingId === doc.id) return true;
    if (term) return true;
    return expanded.has(doc.id);
  }

  function expandAll() {
    setExpanded(new Set(docs.map((d) => d.id)));
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

      <div className="flex items-center gap-3">
        <input
          className="w-full max-w-sm rounded-md border border-neutral-300 px-3 py-2 text-sm"
          placeholder="Dokumente durchsuchen (Titel oder Inhalt)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {term && (
          <span className="text-xs text-neutral-500">
            {filteredDocs.length} von {docs.length} Dokumenten
          </span>
        )}
        {docs.length > 0 && (
          <button
            type="button"
            onClick={expandAll}
            className="ml-auto text-xs text-neutral-500 hover:text-neutral-900"
          >
            Alle aufklappen
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {loading && <p className="text-sm text-neutral-500">Lade...</p>}
        {!loading && docs.length === 0 && (
          <p className="text-sm text-neutral-500">Noch keine Architektur-Dokumente.</p>
        )}
        {!loading && docs.length > 0 && filteredDocs.length === 0 && (
          <p className="text-sm text-neutral-500">Keine Dokumente gefunden.</p>
        )}
        {filteredDocs.map((doc) => (
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
                  <button
                    type="button"
                    onClick={() => toggleExpanded(doc.id)}
                    className="flex flex-1 items-center gap-2 text-left"
                  >
                    <span className="text-neutral-400">{isOpen(doc) ? "▾" : "▸"}</span>
                    <span className="font-medium">{doc.title}</span>
                  </button>
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
                {isOpen(doc) && (
                  <>
                    <div className="mt-2">
                      <MarkdownContent content={doc.content} />
                    </div>
                    <div className="mt-2 text-xs text-neutral-400">
                      Zuletzt aktualisiert: {doc.updated_at}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
