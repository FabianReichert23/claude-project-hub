"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Project } from "@/lib/types";
import RequirementsTab from "./RequirementsTab";
import ArchitectureTab from "./ArchitectureTab";
import TestsTab from "./TestsTab";
import WorklogTab from "./WorklogTab";

type Tab = "requirements" | "architecture" | "tests" | "worklog";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [tab, setTab] = useState<Tab>("requirements");

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then((res) => res.json())
      .then(setProject);
  }, [id]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "requirements", label: "Requirements" },
    { key: "architecture", label: "Architektur" },
    { key: "tests", label: "Tests" },
    { key: "worklog", label: "Worklog" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Alle Projekte
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{project?.name ?? "…"}</h1>
        {project?.description && (
          <p className="mt-1 text-sm text-neutral-600">{project.description}</p>
        )}
      </div>

      <div className="flex gap-1 border-b border-neutral-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium ${
              tab === t.key
                ? "border-b-2 border-neutral-900 text-neutral-900"
                : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === "requirements" && <RequirementsTab projectId={id} />}
        {tab === "architecture" && <ArchitectureTab projectId={id} />}
        {tab === "tests" && <TestsTab projectId={id} />}
        {tab === "worklog" && <WorklogTab projectId={id} />}
      </div>
    </div>
  );
}
