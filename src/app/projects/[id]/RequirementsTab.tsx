"use client";

import { useEffect, useState } from "react";
import { Requirement } from "@/lib/types";
import CommentsSection from "./CommentsSection";

const priorities: Requirement["priority"][] = ["low", "medium", "high", "critical"];
const statuses: Requirement["status"][] = ["draft", "approved", "in_progress", "done", "rejected"];

const statusColor: Record<string, string> = {
  draft: "bg-neutral-100 text-neutral-700",
  approved: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  done: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function RequirementsTab({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Requirement["priority"]>("medium");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  async function load() {
    const res = await fetch(`/api/projects/${projectId}/requirements`);
    setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await fetch(`/api/projects/${projectId}/requirements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, priority }),
    });
    setTitle("");
    setDescription("");
    setPriority("medium");
    load();
  }

  async function updateStatus(id: number, status: string) {
    await fetch(`/api/requirements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function toggleImplemented(r: Requirement) {
    await fetch(`/api/requirements/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ implemented: r.implemented ? 0 : 1 }),
    });
    load();
  }

  async function remove(id: number) {
    if (!confirm("Requirement löschen?")) return;
    await fetch(`/api/requirements/${id}`, { method: "DELETE" });
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

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={create} className="rounded-lg border border-neutral-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-medium text-neutral-700">Neues Requirement</h3>
        <div className="flex flex-col gap-3">
          <input
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            placeholder="Titel"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            placeholder="Beschreibung"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <select
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Requirement["priority"])}
            >
              {priorities.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
            >
              Hinzufügen
            </button>
          </div>
        </div>
      </form>

      <div className="flex flex-col gap-3">
        {loading && <p className="text-sm text-neutral-500">Lade...</p>}
        {!loading && items.length === 0 && (
          <p className="text-sm text-neutral-500">Noch keine Requirements.</p>
        )}
        {items.map((r) => (
          <div key={r.id} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!r.implemented}
                    onChange={() => toggleImplemented(r)}
                    title="Als umgesetzt markieren"
                  />
                  <div className={`font-medium ${r.implemented ? "line-through text-neutral-400" : ""}`}>
                    {r.title}
                  </div>
                  {!!r.implemented && (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
                      umgesetzt
                    </span>
                  )}
                </div>
                {r.description && (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">
                    {r.description}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
                  <span className="rounded bg-neutral-100 px-2 py-0.5">{r.priority}</span>
                  <button
                    onClick={() => toggleExpanded(r.id)}
                    className="text-neutral-500 hover:text-neutral-900"
                  >
                    {expanded.has(r.id) ? "Kommentare ausblenden" : "Kommentare"}
                  </button>
                </div>
                {expanded.has(r.id) && <CommentsSection requirementId={r.id} />}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <select
                  className={`rounded px-2 py-1 text-xs ${statusColor[r.status] ?? ""}`}
                  value={r.status}
                  onChange={(e) => updateStatus(r.id, e.target.value)}
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => remove(r.id)}
                  className="text-xs text-neutral-400 hover:text-red-600"
                >
                  Löschen
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
