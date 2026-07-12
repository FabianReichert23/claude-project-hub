import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { echo } from "@/lib/echoResponse";

type ImportComment = { content: string; created_at?: string };
type ImportEpic = {
  id: number;
  name: string;
  implemented?: number | boolean;
  created_at?: string;
  updated_at?: string;
};
type ImportRequirement = {
  id: number;
  epic_id?: number | null;
  title: string;
  description?: string;
  priority?: string;
  status?: string;
  type?: string;
  implemented?: number | boolean;
  created_at?: string;
  updated_at?: string;
  comments?: ImportComment[];
};
type ImportArchitectureDoc = { title: string; content?: string; created_at?: string; updated_at?: string };
type ImportTest = {
  requirement_id?: number | null;
  title: string;
  description?: string;
  steps?: string;
  expected_result?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
};
type ImportWorklogEntry = { content: string; created_at?: string };

export async function POST(req: NextRequest) {
  const body = await req.json();
  const project = body.project;
  if (!project?.name || typeof project.name !== "string") {
    return NextResponse.json({ error: "project.name is required" }, { status: 400 });
  }

  const epics: ImportEpic[] = Array.isArray(body.epics) ? body.epics : [];
  const requirements: ImportRequirement[] = Array.isArray(body.requirements) ? body.requirements : [];
  const architecture: ImportArchitectureDoc[] = Array.isArray(body.architecture) ? body.architecture : [];
  const tests: ImportTest[] = Array.isArray(body.tests) ? body.tests : [];
  const worklog: ImportWorklogEntry[] = Array.isArray(body.worklog) ? body.worklog : [];

  if (epics.some((e) => !e.name)) {
    return NextResponse.json({ error: "every epic needs a name" }, { status: 400 });
  }
  if (requirements.some((r) => !r.title)) {
    return NextResponse.json({ error: "every requirement needs a title" }, { status: 400 });
  }
  if (requirements.some((r) => r.type !== undefined && r.type !== "requirement" && r.type !== "bug")) {
    return NextResponse.json({ error: "requirement type must be 'requirement' or 'bug'" }, { status: 400 });
  }
  if (architecture.some((a) => !a.title)) {
    return NextResponse.json({ error: "every architecture doc needs a title" }, { status: 400 });
  }
  if (tests.some((t) => !t.title)) {
    return NextResponse.json({ error: "every test needs a title" }, { status: 400 });
  }

  const insertProject = db.prepare(
    `INSERT INTO projects (name, description, created_at, updated_at)
     VALUES (?, ?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))`
  );
  const insertEpic = db.prepare(
    `INSERT INTO epics (project_id, name, implemented, created_at, updated_at)
     VALUES (?, ?, ?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))`
  );
  const insertRequirement = db.prepare(
    `INSERT INTO requirements (project_id, epic_id, title, description, priority, status, type, implemented, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))`
  );
  const insertComment = db.prepare(
    `INSERT INTO comments (requirement_id, content, created_at) VALUES (?, ?, COALESCE(?, datetime('now')))`
  );
  const insertArchitecture = db.prepare(
    `INSERT INTO architecture_docs (project_id, title, content, created_at, updated_at)
     VALUES (?, ?, ?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))`
  );
  const insertTest = db.prepare(
    `INSERT INTO tests (project_id, requirement_id, title, description, steps, expected_result, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')), COALESCE(?, datetime('now')))`
  );
  const insertWorklog = db.prepare(
    `INSERT INTO worklog_entries (project_id, content, created_at) VALUES (?, ?, COALESCE(?, datetime('now')))`
  );
  const selectProject = db.prepare("SELECT * FROM projects WHERE id = ?");

  const importAll = db.transaction(() => {
    const projectResult = insertProject.run(
      project.name,
      project.description ?? "",
      project.created_at ?? null,
      project.updated_at ?? null
    );
    const newProjectId = projectResult.lastInsertRowid as number;

    const epicIdMap = new Map<number, number>();
    for (const epic of epics) {
      const result = insertEpic.run(
        newProjectId,
        epic.name,
        epic.implemented ? 1 : 0,
        epic.created_at ?? null,
        epic.updated_at ?? null
      );
      epicIdMap.set(epic.id, result.lastInsertRowid as number);
    }

    const requirementIdMap = new Map<number, number>();
    for (const r of requirements) {
      const newEpicId = r.epic_id != null ? epicIdMap.get(r.epic_id) ?? null : null;
      const result = insertRequirement.run(
        newProjectId,
        newEpicId,
        r.title,
        r.description ?? "",
        r.priority ?? "medium",
        r.status ?? "draft",
        r.type ?? "requirement",
        r.implemented ? 1 : 0,
        r.created_at ?? null,
        r.updated_at ?? null
      );
      const newReqId = result.lastInsertRowid as number;
      requirementIdMap.set(r.id, newReqId);
      for (const c of r.comments ?? []) {
        insertComment.run(newReqId, c.content, c.created_at ?? null);
      }
    }

    for (const doc of architecture) {
      insertArchitecture.run(
        newProjectId,
        doc.title,
        doc.content ?? "",
        doc.created_at ?? null,
        doc.updated_at ?? null
      );
    }

    for (const t of tests) {
      const newReqId = t.requirement_id != null ? requirementIdMap.get(t.requirement_id) ?? null : null;
      insertTest.run(
        newProjectId,
        newReqId,
        t.title,
        t.description ?? "",
        t.steps ?? "",
        t.expected_result ?? "",
        t.status ?? "pending",
        t.created_at ?? null,
        t.updated_at ?? null
      );
    }

    for (const w of worklog) {
      insertWorklog.run(newProjectId, w.content, w.created_at ?? null);
    }

    return selectProject.get(newProjectId) as Record<string, unknown>;
  });

  try {
    const newProject = importAll();
    return echo(req, newProject, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
