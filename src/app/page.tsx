"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Project } from "@/lib/types";

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/projects");
    setProjects(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return;
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Fehler beim Erstellen");
      return;
    }
    setName("");
    setDescription("");
    load();
  }

  async function deleteProject(id: number) {
    if (!confirm("Projekt inklusive aller Requirements/Tests/Architektur löschen?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-2xl font-semibold">Projekte</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Requirements, Tests und Architektur für deine Claude-Projekte an einem Ort.
        </p>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-medium text-neutral-700">Neues Projekt</h2>
        <form onSubmit={createProject} className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <input
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
            placeholder="Projektname"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
            placeholder="Kurzbeschreibung (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Anlegen
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </section>

      <section className="flex flex-col gap-3">
        {loading && <p className="text-sm text-neutral-500">Lade Projekte...</p>}
        {!loading && projects.length === 0 && (
          <p className="text-sm text-neutral-500">Noch keine Projekte angelegt.</p>
        )}
        {projects.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4 hover:border-neutral-300"
          >
            <Link href={`/projects/${p.id}`} className="flex-1">
              <div className="font-medium">{p.name}</div>
              {p.description && (
                <div className="mt-0.5 text-sm text-neutral-500">{p.description}</div>
              )}
            </Link>
            <button
              onClick={() => deleteProject(p.id)}
              className="ml-4 text-sm text-neutral-400 hover:text-red-600"
            >
              Löschen
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
