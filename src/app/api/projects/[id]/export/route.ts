import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

// Export is a dedicated backup/migration endpoint, not a browsing list — it deliberately
// always returns everything (no lean-by-default / ?expand=full here, see leanList.ts).
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const project = db
    .prepare("SELECT name, description, created_at, updated_at FROM projects WHERE id = ?")
    .get(id);
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });

  const epics = db
    .prepare(
      "SELECT id, name, implemented, created_at, updated_at FROM epics WHERE project_id = ? ORDER BY id ASC"
    )
    .all(id);

  const requirementRows = db
    .prepare(
      `SELECT id, epic_id, title, description, priority, status, type, implemented, created_at, updated_at
       FROM requirements WHERE project_id = ? ORDER BY id ASC`
    )
    .all(id) as Record<string, unknown>[];

  const comments = db
    .prepare(
      `SELECT c.requirement_id, c.content, c.created_at
       FROM comments c JOIN requirements r ON r.id = c.requirement_id
       WHERE r.project_id = ? ORDER BY c.created_at ASC`
    )
    .all(id) as { requirement_id: number; content: string; created_at: string }[];

  const requirements = requirementRows.map((r) => ({
    ...r,
    comments: comments
      .filter((c) => c.requirement_id === r.id)
      .map((c) => ({ content: c.content, created_at: c.created_at })),
  }));

  const architecture = db
    .prepare(
      "SELECT title, content, created_at, updated_at FROM architecture_docs WHERE project_id = ? ORDER BY id ASC"
    )
    .all(id);

  const tests = db
    .prepare(
      `SELECT requirement_id, title, description, steps, expected_result, status, created_at, updated_at
       FROM tests WHERE project_id = ? ORDER BY id ASC`
    )
    .all(id);

  const worklog = db
    .prepare("SELECT content, created_at FROM worklog_entries WHERE project_id = ? ORDER BY id ASC")
    .all(id);

  return NextResponse.json({
    version: 1,
    exported_at: new Date().toISOString(),
    project,
    epics,
    requirements,
    architecture,
    tests,
    worklog,
  });
}
