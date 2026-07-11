"use client";

import { useEffect, useState } from "react";
import { Requirement, TestCase } from "@/lib/types";

const statuses: TestCase["status"][] = ["pending", "pass", "fail", "blocked"];

const statusColor: Record<string, string> = {
  pending: "bg-neutral-100 text-neutral-700",
  pass: "bg-green-100 text-green-700",
  fail: "bg-red-100 text-red-700",
  blocked: "bg-amber-100 text-amber-700",
};

export default function TestsTab({ projectId }: { projectId: string }) {
  const [items, setItems] = useState<TestCase[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [steps, setSteps] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [requirementId, setRequirementId] = useState<string>("");

  async function load() {
    const [testsRes, reqRes] = await Promise.all([
      fetch(`/api/projects/${projectId}/tests`),
      fetch(`/api/projects/${projectId}/requirements`),
    ]);
    setItems(await testsRes.json());
    setRequirements(await reqRes.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await fetch(`/api/projects/${projectId}/tests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        steps,
        expected_result: expectedResult,
        requirement_id: requirementId ? Number(requirementId) : null,
      }),
    });
    setTitle("");
    setSteps("");
    setExpectedResult("");
    setRequirementId("");
    load();
  }

  async function updateStatus(id: number, status: string) {
    await fetch(`/api/tests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function remove(id: number) {
    if (!confirm("Test löschen?")) return;
    await fetch(`/api/tests/${id}`, { method: "DELETE" });
    load();
  }

  function requirementTitle(id: number | null) {
    if (!id) return null;
    return requirements.find((r) => r.id === id)?.title ?? null;
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={create} className="rounded-lg border border-neutral-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-medium text-neutral-700">Neuer Test</h3>
        <div className="flex flex-col gap-3">
          <input
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            placeholder="Titel"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            placeholder="Schritte"
            rows={3}
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
          />
          <textarea
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            placeholder="Erwartetes Ergebnis"
            rows={2}
            value={expectedResult}
            onChange={(e) => setExpectedResult(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <select
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
              value={requirementId}
              onChange={(e) => setRequirementId(e.target.value)}
            >
              <option value="">Kein Requirement verknüpft</option>
              {requirements.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
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
          <p className="text-sm text-neutral-500">Noch keine Tests.</p>
        )}
        {items.map((t) => (
          <div key={t.id} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{t.title}</div>
                {t.steps && (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">
                    <span className="text-neutral-400">Schritte: </span>
                    {t.steps}
                  </p>
                )}
                {t.expected_result && (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-600">
                    <span className="text-neutral-400">Erwartet: </span>
                    {t.expected_result}
                  </p>
                )}
                {requirementTitle(t.requirement_id) && (
                  <div className="mt-2 text-xs text-neutral-500">
                    verknüpft mit: {requirementTitle(t.requirement_id)}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <select
                  className={`rounded px-2 py-1 text-xs ${statusColor[t.status] ?? ""}`}
                  value={t.status}
                  onChange={(e) => updateStatus(t.id, e.target.value)}
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => remove(t.id)}
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
