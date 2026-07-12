"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Project } from "@/lib/types";

const CLAUDE_STARTER_PROMPT = `Ich nutze den "Claude Project Hub" (lokale App unter http://localhost:3000) um Requirements, Architektur-Dokumentation und Tests für dieses Projekt zu verwalten. Bitte beachte während dieser Session folgende Regeln:

0. MCP bevorzugen: Falls der MCP-Server "claude-project-hub" in dieser Session verbunden ist (Tool-Liste bzw. /mcp prüfen), nutze direkt dessen Tools (get_project_summary, list_requirements, create_requirement(s), update_requirement, list/update_architecture_doc, create_test, add_worklog_entry, ...) statt der unten beschriebenen curl-Aufrufe — gleiche Operationen, aber ohne Bash-Overhead und ohne das Windows-Encoding-Problem aus Regel 6. Setup falls noch nicht verbunden: siehe mcp/README.md im Repo. Ist kein MCP verbunden, gelten die REST-Aufrufe unten unverändert als Fallback.

1. Zuerst orientieren: Rufe zu Beginn GET http://localhost:3000/api/projects/<PROJECT_ID>/summary auf, um Projektstatus, Epics, offene Requirements und vorhandene Architektur-Dokumente zu sehen, bevor du den Code durchsuchst. Lies außerdem den letzten Worklog-Eintrag (GET /api/projects/<PROJECT_ID>/worklog?limit=1) — dort steht, wo die letzte Session aufgehört hat.
   Falls es noch kein Projekt im Hub für dieses Repo gibt: leg eins per POST /api/projects an und nenne mir die ID.

2. Bei neuen Features/Änderungen:
   - Lege ein Requirement an (POST /api/projects/:id/requirements, bei mehreren auf einmal POST /api/projects/:id/requirements/batch) mit einer Beschreibung, die konkret genug ist, dass du sie später als technischen Kontext wiederverwenden kannst (Umsetzungsvorschlag, betroffene Dateien, offene Design-Fragen) — nicht nur eine kurze User-Story.
   - Ordne das Requirement einem passenden Epic zu, leg bei Bedarf ein neues an (POST /api/projects/:id/epics).
   - Markiere Requirements nach Fertigstellung als implemented / status "done" (PATCH /api/requirements/:id).
   - Leg für jedes fertige Feature einen Test-Case an (POST /api/projects/:id/tests), der beschreibt, wie man es manuell verifiziert.

3. Architektur-Dokumentation aktuell halten: Wenn sich Struktur, Datenmodell oder Konventionen ändern, aktualisiere die betroffenen Architektur-Dokumente (PATCH /api/architecture/:id) im selben Arbeitsschritt, nicht als Nachtrag. Falls noch keine existieren, leg mindestens ein Dokument zur Repo-Struktur und eins zu Coding-Conventions an.

4. Vor der Antwort "was ist schon umgesetzt?" immer zuerst im Hub nachschauen (Summary-Endpoint bzw. Requirements-Liste), nicht raten oder nur den Code lesen.

5. Am Ende der Session (oder wenn ich mich verabschiede): Schreib einen kurzen Worklog-Eintrag (POST /api/projects/<PROJECT_ID>/worklog, Feld "content", Markdown, 3-8 Zeilen): was erledigt wurde (mit Requirement-IDs), was offen blieb, empfohlener nächster Schritt, ggf. Stolpersteine. Keine Code-Diffs.

6. Falls du unter Windows/Git-Bash arbeitest: curl -d "..." kann Umlaute/Sonderzeichen verstümmeln. Payload stattdessen als UTF-8-Datei schreiben und --data-binary @datei.json verwenden, oder ein kleines Node-Skript mit fetch().

Projekt-ID in diesem Hub: <TRAGE HIER DIE PROJEKT-ID EIN, oder leg selbst ein neues Projekt an und nenne mir die ID>`;

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [promptExpanded, setPromptExpanded] = useState(false);

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

  async function copyPrompt() {
    await navigator.clipboard.writeText(CLAUDE_STARTER_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="text-2xl font-semibold">Projekte</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Requirements, Epics, Architektur-Dokumentation und Tests für deine Claude-Projekte an einem
          Ort — mit REST-API, über die Claude direkt mitlesen und mitschreiben kann.
        </p>
        <ul className="mt-3 flex flex-col gap-1 text-sm text-neutral-600">
          <li>• Requirements nach Epics/Features gruppieren, Fortschritt pro Epic auf einen Blick</li>
          <li>• Architektur-Dokumente mit Markdown &amp; Mermaid-Diagrammen, durchsuchbar</li>
          <li>• Tests anlegen und optional mit Requirements verknüpfen</li>
          <li>• REST-API inkl. Batch- und Summary-Endpoint, damit Claude sich schnell orientieren kann</li>
        </ul>
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => setPromptExpanded((v) => !v)}
            className="flex flex-1 items-start gap-2 text-left"
          >
            <span className="mt-0.5 text-neutral-400">{promptExpanded ? "▾" : "▸"}</span>
            <div>
              <h2 className="text-sm font-medium text-neutral-700">Session-Start-Prompt für Claude</h2>
              <p className="mt-1 text-sm text-neutral-600">
                Am Anfang einer Claude-Session einfügen, damit Claude weiß, wie es diesen Hub während
                der Arbeit an deinem Projekt nutzen soll.
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={copyPrompt}
            className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
          >
            {copied ? "Kopiert!" : "Kopieren"}
          </button>
        </div>
        {promptExpanded && (
          <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-neutral-50 p-3 font-mono text-xs text-neutral-700">
            {CLAUDE_STARTER_PROMPT}
          </pre>
        )}
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
