"use client";

import { useEffect, useMemo, useState } from "react";
import { Epic, Requirement } from "@/lib/types";
import CommentsSection from "./CommentsSection";

const priorities: Requirement["priority"][] = ["low", "medium", "high", "critical"];
const statuses: Requirement["status"][] = ["draft", "approved", "in_progress", "done", "rejected"];
const types: Requirement["type"][] = ["requirement", "bug"];

const statusColor: Record<string, string> = {
  draft: "bg-neutral-100 text-neutral-700",
  approved: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  done: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const typeLabel: Record<string, string> = {
  requirement: "Requirement",
  bug: "Bug",
};

const typeColor: Record<string, string> = {
  requirement: "bg-neutral-100 text-neutral-700",
  bug: "bg-red-100 text-red-700",
};

function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function chipClass(active: boolean) {
  return active
    ? "rounded-full bg-neutral-900 px-3 py-1 text-xs text-white"
    : "rounded-full border border-neutral-300 px-3 py-1 text-xs text-neutral-600 hover:bg-neutral-50";
}

const NO_EPIC_KEY = 0;
const NEW_EPIC_VALUE = "__new__";

export default function RequirementsTab({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<Requirement[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Requirement["priority"]>("medium");
  const [type, setType] = useState<Requirement["type"]>("requirement");
  const [epicId, setEpicId] = useState<number | null>(null);
  const [creatingEpic, setCreatingEpic] = useState(false);
  const [newEpicName, setNewEpicName] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [editingEpicId, setEditingEpicId] = useState<number | null>(null);
  const [editingEpicName, setEditingEpicName] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [priorityFilter, setPriorityFilter] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [onlyOpen, setOnlyOpen] = useState(false);

  async function load() {
    const res = await fetch(`/api/projects/${projectId}/requirements`);
    setItems(await res.json());
    setLoading(false);
  }

  async function loadEpics() {
    const res = await fetch(`/api/projects/${projectId}/epics`);
    setEpics(await res.json());
  }

  useEffect(() => {
    load();
    loadEpics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await fetch(`/api/projects/${projectId}/requirements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, priority, type, epic_id: epicId }),
    });
    setTitle("");
    setDescription("");
    setPriority("medium");
    setType("requirement");
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

  async function updateType(id: number, newType: string) {
    await fetch(`/api/requirements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: newType }),
    });
    load();
  }

  async function updateEpicAssignment(id: number, newEpicId: number | null) {
    await fetch(`/api/requirements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ epic_id: newEpicId }),
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

  function toggleGroup(key: number) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function createEpicInline() {
    if (!newEpicName.trim()) return;
    const res = await fetch(`/api/projects/${projectId}/epics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newEpicName }),
    });
    const created: Epic = await res.json();
    setEpics((prev) => [...prev, created]);
    setEpicId(created.id);
    setNewEpicName("");
    setCreatingEpic(false);
  }

  function startRenameEpic(epic: Epic) {
    setEditingEpicId(epic.id);
    setEditingEpicName(epic.name);
  }

  async function saveRenameEpic(id: number) {
    if (!editingEpicName.trim()) {
      setEditingEpicId(null);
      return;
    }
    await fetch(`/api/epics/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editingEpicName }),
    });
    setEditingEpicId(null);
    loadEpics();
  }

  async function toggleEpicImplemented(epic: Epic) {
    await fetch(`/api/epics/${epic.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ implemented: epic.implemented ? 0 : 1 }),
    });
    loadEpics();
  }

  async function deleteEpic(id: number) {
    if (!confirm("Epic löschen? Requirements bleiben erhalten, verlieren aber die Zuordnung.")) return;
    await fetch(`/api/epics/${id}`, { method: "DELETE" });
    loadEpics();
    load();
  }

  const term = search.trim().toLowerCase();
  const filtersActive =
    term !== "" || statusFilter.size > 0 || priorityFilter.size > 0 || typeFilter.size > 0 || onlyOpen;

  const filteredItems = useMemo(() => {
    return items.filter((r) => {
      if (term && !r.title.toLowerCase().includes(term) && !r.description.toLowerCase().includes(term))
        return false;
      if (statusFilter.size > 0 && !statusFilter.has(r.status)) return false;
      if (priorityFilter.size > 0 && !priorityFilter.has(r.priority)) return false;
      if (typeFilter.size > 0 && !typeFilter.has(r.type)) return false;
      if (onlyOpen && r.implemented) return false;
      return true;
    });
  }, [items, term, statusFilter, priorityFilter, typeFilter, onlyOpen]);

  const groups = useMemo(() => {
    const byEpic = new Map<number, Requirement[]>();
    const none: Requirement[] = [];
    for (const r of filteredItems) {
      if (r.epic_id == null) {
        none.push(r);
      } else {
        if (!byEpic.has(r.epic_id)) byEpic.set(r.epic_id, []);
        byEpic.get(r.epic_id)!.push(r);
      }
    }
    return { byEpic, none };
  }, [filteredItems]);

  function expandAllGroups() {
    const keys: number[] = [];
    if (groups.none.length > 0) keys.push(NO_EPIC_KEY);
    epics.forEach((ep) => keys.push(ep.id));
    setExpandedGroups(new Set(keys));
  }

  function renderRequirement(r: Requirement) {
    return (
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
              <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">{r.description}</p>
            )}
            <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
              <span className="rounded bg-neutral-100 px-2 py-0.5">{r.priority}</span>
              <span className={`rounded px-2 py-0.5 ${typeColor[r.type] ?? ""}`}>
                {typeLabel[r.type] ?? r.type}
              </span>
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
            <select
              className="rounded border border-neutral-200 px-2 py-1 text-xs text-neutral-600"
              value={r.type}
              onChange={(e) => updateType(r.id, e.target.value)}
              title="Kategorie"
            >
              {types.map((t) => (
                <option key={t} value={t}>
                  {typeLabel[t]}
                </option>
              ))}
            </select>
            <select
              className="rounded border border-neutral-200 px-2 py-1 text-xs text-neutral-600"
              value={r.epic_id ?? ""}
              onChange={(e) =>
                updateEpicAssignment(r.id, e.target.value ? Number(e.target.value) : null)
              }
              title="Epic zuordnen"
            >
              <option value="">Ohne Epic</option>
              {epics.map((ep) => (
                <option key={ep.id} value={ep.id}>
                  {ep.name}
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
    );
  }

  function renderGroup(key: number, name: string, list: Requirement[], epic: Epic | null) {
    const collapsed = filtersActive ? false : !expandedGroups.has(key);
    const doneCount = list.filter((r) => !!r.implemented).length;
    const isEditing = epic ? editingEpicId === epic.id : false;

    return (
      <div key={key} className="rounded-lg border border-neutral-200 bg-neutral-50">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <button
            type="button"
            onClick={() => toggleGroup(key)}
            className="flex flex-1 items-center gap-2 text-left"
          >
            <span className="text-neutral-400">{collapsed ? "▸" : "▾"}</span>
            {epic && (
              <input
                type="checkbox"
                checked={!!epic.implemented}
                onClick={(e) => e.stopPropagation()}
                onChange={() => toggleEpicImplemented(epic)}
                title="Epic als Ganzes als umgesetzt markieren"
              />
            )}
            {isEditing ? (
              <input
                autoFocus
                className="rounded border border-neutral-300 px-2 py-0.5 text-sm"
                value={editingEpicName}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setEditingEpicName(e.target.value)}
                onBlur={() => saveRenameEpic(epic!.id)}
                onKeyDown={(e) => e.key === "Enter" && saveRenameEpic(epic!.id)}
              />
            ) : (
              <span
                className={`font-medium ${epic?.implemented ? "line-through text-neutral-400" : ""}`}
                onClick={(e) => {
                  if (epic) {
                    e.stopPropagation();
                    startRenameEpic(epic);
                  }
                }}
              >
                {name}
              </span>
            )}
            <span className="text-xs text-neutral-500">
              ({list.length}
              {list.length > 0 ? `, ${doneCount}/${list.length} umgesetzt` : ""})
            </span>
          </button>
          {epic && (
            <button
              type="button"
              onClick={() => deleteEpic(epic.id)}
              className="shrink-0 text-xs text-neutral-400 hover:text-red-600"
            >
              Epic löschen
            </button>
          )}
        </div>
        {!collapsed && (
          <div className="flex flex-col gap-3 px-4 pb-4">
            {list.length === 0 && (
              <p className="text-xs text-neutral-400">Keine Requirements in diesem Epic.</p>
            )}
            {list.map((r) => renderRequirement(r))}
          </div>
        )}
      </div>
    );
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
          <div className="flex flex-wrap items-center gap-3">
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
            <select
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value as Requirement["type"])}
            >
              {types.map((t) => (
                <option key={t} value={t}>
                  {typeLabel[t]}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
              value={epicId ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                if (val === NEW_EPIC_VALUE) {
                  setCreatingEpic(true);
                } else {
                  setEpicId(val ? Number(val) : null);
                }
              }}
            >
              <option value="">Kein Epic</option>
              {epics.map((ep) => (
                <option key={ep.id} value={ep.id}>
                  {ep.name}
                </option>
              ))}
              <option value={NEW_EPIC_VALUE}>+ Neues Epic anlegen</option>
            </select>
            <button
              type="submit"
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
            >
              Hinzufügen
            </button>
          </div>
          {creatingEpic && (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
                placeholder="Name des neuen Epics"
                value={newEpicName}
                onChange={(e) => setNewEpicName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createEpicInline()}
              />
              <button
                type="button"
                onClick={createEpicInline}
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
              >
                Anlegen
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreatingEpic(false);
                  setNewEpicName("");
                }}
                className="text-sm text-neutral-500 hover:text-neutral-900"
              >
                Abbrechen
              </button>
            </div>
          )}
        </div>
      </form>

      {!loading && items.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <input
              className="w-full max-w-sm rounded-md border border-neutral-300 px-3 py-2 text-sm"
              placeholder="Requirements durchsuchen (Titel oder Beschreibung)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {filtersActive && (
              <span className="text-xs text-neutral-500">
                {filteredItems.length} von {items.length} Requirements
              </span>
            )}
            <button
              type="button"
              onClick={expandAllGroups}
              className="ml-auto text-xs text-neutral-500 hover:text-neutral-900"
            >
              Alle aufklappen
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-neutral-400">Status:</span>
            {statuses.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter((prev) => toggleInSet(prev, s))}
                className={chipClass(statusFilter.has(s))}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-neutral-400">Priorität:</span>
            {priorities.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriorityFilter((prev) => toggleInSet(prev, p))}
                className={chipClass(priorityFilter.has(p))}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-neutral-400">Kategorie:</span>
            {types.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter((prev) => toggleInSet(prev, t))}
                className={chipClass(typeFilter.has(t))}
              >
                {typeLabel[t]}
              </button>
            ))}
            <label className="ml-2 flex items-center gap-1.5 text-xs text-neutral-600">
              <input
                type="checkbox"
                checked={onlyOpen}
                onChange={(e) => setOnlyOpen(e.target.checked)}
              />
              nur offene
            </label>
            {filtersActive && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setStatusFilter(new Set());
                  setPriorityFilter(new Set());
                  setTypeFilter(new Set());
                  setOnlyOpen(false);
                }}
                className="ml-auto text-xs text-neutral-500 hover:text-neutral-900"
              >
                Filter zurücksetzen
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {loading && <p className="text-sm text-neutral-500">Lade...</p>}
        {!loading && items.length === 0 && (
          <p className="text-sm text-neutral-500">Noch keine Requirements.</p>
        )}
        {!loading && items.length > 0 && filtersActive && filteredItems.length === 0 && (
          <p className="text-sm text-neutral-500">Keine Requirements gefunden.</p>
        )}
        {!loading && groups.none.length > 0 &&
          renderGroup(NO_EPIC_KEY, "Ohne Epic", groups.none, null)}
        {!loading &&
          epics.map((epic) => {
            const list = groups.byEpic.get(epic.id) ?? [];
            if (filtersActive && list.length === 0) return null;
            return renderGroup(epic.id, epic.name, list, epic);
          })}
      </div>
    </div>
  );
}
