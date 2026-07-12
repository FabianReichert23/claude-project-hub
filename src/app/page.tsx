"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Project } from "@/lib/types";

const CLAUDE_STARTER_PROMPT = `Ich nutze den "Claude Project Hub" (lokale App unter http://localhost:3000) um Requirements, Architektur-Dokumentation und Tests für dieses Projekt zu verwalten. Bitte beachte während dieser Session folgende Regeln:

0. MCP bevorzugen: Falls der MCP-Server "claude-project-hub" in dieser Session verbunden ist (Tool-Liste bzw. /mcp prüfen), nutze direkt dessen Tools (get_project_summary, list_requirements, create_requirement(s), update_requirement, list/update_architecture_doc, create_test, add_worklog_entry, ...) statt der unten beschriebenen curl-Aufrufe — gleiche Operationen, aber ohne Bash-Overhead und ohne das Windows-Encoding-Problem aus Regel 6. Setup falls noch nicht verbunden: siehe mcp/README.md im Repo. Ist kein MCP verbunden, gelten die REST-Aufrufe unten unverändert als Fallback.

1. Zuerst orientieren: Rufe zu Beginn GET http://localhost:3000/api/projects/<PROJECT_ID>/summary auf, um Projektstatus, Epics, offene Requirements und vorhandene Architektur-Dokumente zu sehen, bevor du den Code durchsuchst. Lies außerdem den letzten Worklog-Eintrag (GET /api/projects/<PROJECT_ID>/worklog?limit=1) — dort steht, wo die letzte Session aufgehört hat.
   Falls es noch kein Projekt im Hub für dieses Repo gibt: leg eins per POST /api/projects an und nenne mir die ID.

2. Bei neuen Features/Änderungen:
   - Lege ein Requirement an (POST /api/projects/:id/requirements, bei mehreren auf einmal POST /api/projects/:id/requirements/batch) mit einer Beschreibung, die konkret genug ist, dass du sie später als technischen Kontext wiederverwenden kannst (Umsetzungsvorschlag, betroffene Dateien, offene Design-Fragen) — nicht nur eine kurze User-Story. Beschreibung dabei kurz halten (Richtwert ~300-500 Zeichen für Kernaussage + Umsetzungsvorschlag): auf bereits dokumentiertes Wissen verweisen ("siehe Coding-Conventions, Abschnitt X") statt Standard-Patterns erneut auszuformulieren — dokumentiere Entscheidungen und Abweichungen vom Standard, nicht das Standard-Pattern selbst. Ausnahme: genuin neuartige Features, bei denen die Design-Entscheidung selbst der wertvolle Inhalt ist — dort ist Ausführlichkeit gerechtfertigt.
   - Ordne das Requirement einem passenden Epic zu, leg bei Bedarf ein neues an (POST /api/projects/:id/epics).
   - Markiere Requirements nach Fertigstellung als implemented / status "done" (PATCH /api/requirements/:id).
   - Leg für jedes fertige Feature einen Test-Case an (POST /api/projects/:id/tests), der beschreibt, wie man es manuell verifiziert.

3. Architektur-Dokumentation aktuell halten: Wenn sich Struktur, Datenmodell oder Konventionen ändern, aktualisiere die betroffenen Architektur-Dokumente (PATCH /api/architecture/:id) im selben Arbeitsschritt, nicht als Nachtrag. Falls noch keine existieren, leg mindestens ein Dokument zur Repo-Struktur und eins zu Coding-Conventions an.

4. Vor der Antwort "was ist schon umgesetzt?" immer zuerst im Hub nachschauen (Summary-Endpoint bzw. Requirements-Liste), nicht raten oder nur den Code lesen.

5. Am Ende der Session (oder wenn ich mich verabschiede): Schreib einen kurzen Worklog-Eintrag (POST /api/projects/<PROJECT_ID>/worklog, Feld "content", Markdown, 3-8 Zeilen): was erledigt wurde (mit Requirement-IDs), was offen blieb, empfohlener nächster Schritt, ggf. Stolpersteine. Keine Code-Diffs.

6. Falls du unter Windows/Git-Bash arbeitest: curl -d "..." kann Umlaute/Sonderzeichen verstümmeln. Payload stattdessen als UTF-8-Datei schreiben und --data-binary @datei.json verwenden, oder ein kleines Node-Skript mit fetch().

Projekt-ID in diesem Hub: <TRAGE HIER DIE PROJEKT-ID EIN, oder leg selbst ein neues Projekt an und nenne mir die ID>`;

const SYNC_EXISTING_PROJECT_PROMPT = `Dieses Repo existiert schon, hat aber noch kein Projekt im "Claude Project Hub" (lokale App unter http://localhost:3000). Bitte hole das jetzt einmalig nach, bevor wir weiterarbeiten:

0. MCP bevorzugen: Falls der MCP-Server "claude-project-hub" verbunden ist (Tool-Liste bzw. /mcp prüfen), nutze dessen Tools (list_projects, create_project, create_epic, create_requirements_batch, create_architecture_doc, create_test, add_worklog_entry, ...) statt curl. Setup falls nötig: siehe mcp/README.md im Repo. Sonst REST unter /api/* als Fallback.

1. Prüfen, ob für dieses Repo bereits ein Projekt existiert (list_projects bzw. GET /api/projects, Name/Beschreibung abgleichen). Falls nicht: Projekt anlegen (create_project) mit sprechendem Namen und kurzer Beschreibung.

2. Codebasis erkunden, um dir ein Bild zu machen (Package-Manifest wie package.json/pyproject.toml/go.mod, README, Verzeichnisstruktur, git log --oneline -20, vorhandene Docs/Kommentare). Ziel: Stack, Hauptfeatures, grobe Architektur verstehen — kein vollständiger Code-Review.

3. Epics für die wichtigsten Feature-/Funktionsbereiche anlegen (grobe Gruppierung, meist reichen 3-8 Epics).

4. Requirements für bereits umgesetzte Kernfunktionen anlegen (create_requirements_batch), jeweils mit status "done"/implemented=1 und passendem Epic. WICHTIG: kuratieren statt vollständig erfassen — die wichtigsten ~10-20 Punkte, die den Kern der App ausmachen, nicht jede einzelne Funktion. Beschreibung kurz halten (~300-500 Zeichen: was es tut + wo im Code), keine Standard-Boilerplate ausformulieren.

5. Mindestens 2 Architektur-Dokumente anlegen: eins zu Repo-Struktur/Stack (welche Verzeichnisse/Dateien wofür), eins zu Coding-Conventions/wiederkehrenden Mustern, die du im Code erkennst (Namensschemata, Fehlerbehandlung, Teststrategie, ...).

6. Für die 3-5 wichtigsten Kernfunktionen je einen Test-Case anlegen, der beschreibt, wie man sie manuell verifiziert (status "pending", falls nicht selbst durchgeführt).

7. Abschließend einen ersten Worklog-Eintrag schreiben: was beim Onboarding erfasst wurde, was bewusst ausgelassen wurde (z.B. bei einem großen Repo), empfohlener nächster Schritt.

8. Am Ende: nenne mir die neue Projekt-ID, damit ich sie in meinen normalen Session-Start-Prompt eintragen kann.

Ziel ist ein brauchbarer erster Schnappschuss, keine vollständige Dokumentation — der Rest ergänzt sich von selbst über den normalen Session-Start-Prompt in künftigen Sessions.`;

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [syncCopied, setSyncCopied] = useState(false);
  const [syncPromptExpanded, setSyncPromptExpanded] = useState(false);

  async function load() {
    const res = await fetch("/api/projects");
    setProjects(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: initial load, see Coding-Conventions "Kein optimistic UI"
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

  async function importProject(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportError(null);
    let data: unknown;
    try {
      data = JSON.parse(await file.text());
    } catch {
      setImportError("Datei ist kein gültiges JSON.");
      return;
    }
    const res = await fetch("/api/projects/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      setImportError(err.error ?? "Fehler beim Import");
      return;
    }
    load();
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(CLAUDE_STARTER_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function copySyncPrompt() {
    await navigator.clipboard.writeText(SYNC_EXISTING_PROJECT_PROMPT);
    setSyncCopied(true);
    setTimeout(() => setSyncCopied(false), 2000);
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
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => setSyncPromptExpanded((v) => !v)}
            className="flex flex-1 items-start gap-2 text-left"
          >
            <span className="mt-0.5 text-neutral-400">{syncPromptExpanded ? "▾" : "▸"}</span>
            <div>
              <h2 className="text-sm font-medium text-neutral-700">Bestehendes Projekt synchronisieren</h2>
              <p className="mt-1 text-sm text-neutral-600">
                Für Repos, die noch kein Projekt im Hub haben: diesen Prompt kopieren und in Claude
                einfügen, damit Claude die Codebasis erkundet und Requirements, Architektur-Docs, Tests
                und einen ersten Worklog-Eintrag anlegt.
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={copySyncPrompt}
            className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
          >
            {syncCopied ? "Kopiert!" : "Kopieren"}
          </button>
        </div>
        {syncPromptExpanded && (
          <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-neutral-50 p-3 font-mono text-xs text-neutral-700">
            {SYNC_EXISTING_PROJECT_PROMPT}
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
        <div className="mt-3 flex items-center gap-2 border-t border-neutral-100 pt-3">
          <label className="cursor-pointer rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50">
            Projekt aus JSON importieren...
            <input type="file" accept="application/json" onChange={importProject} className="hidden" />
          </label>
          <span className="text-xs text-neutral-500">Stellt ein per &quot;Exportieren&quot; gesichertes Projekt neu her.</span>
        </div>
        {importError && <p className="mt-2 text-sm text-red-600">{importError}</p>}
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
