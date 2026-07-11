import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

const requirementStatuses = ["draft", "approved", "in_progress", "done", "rejected"];
const testStatuses = ["pending", "pass", "fail", "blocked"];

function countByStatus(statuses: string[], rows: { status: string; count: number }[]) {
  const byStatus: Record<string, number> = Object.fromEntries(statuses.map((s) => [s, 0]));
  for (const row of rows) byStatus[row.status] = row.count;
  return byStatus;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const project = db
    .prepare("SELECT id, name, description, created_at, updated_at FROM projects WHERE id = ?")
    .get(id);
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });

  const requirementTotals = db
    .prepare(
      `SELECT COUNT(*) as total,
              COALESCE(SUM(implemented), 0) as implemented,
              COALESCE(SUM(CASE WHEN epic_id IS NULL THEN 1 ELSE 0 END), 0) as without_epic
       FROM requirements WHERE project_id = ?`
    )
    .get(id) as { total: number; implemented: number; without_epic: number };

  const requirementStatusRows = db
    .prepare("SELECT status, COUNT(*) as count FROM requirements WHERE project_id = ? GROUP BY status")
    .all(id) as { status: string; count: number }[];

  const epics = db
    .prepare(
      `SELECT e.id, e.name, e.implemented,
              COUNT(r.id) as requirements_total,
              COALESCE(SUM(CASE WHEN r.implemented = 1 THEN 1 ELSE 0 END), 0) as requirements_done
       FROM epics e
       LEFT JOIN requirements r ON r.epic_id = e.id
       WHERE e.project_id = ?
       GROUP BY e.id
       ORDER BY e.created_at ASC`
    )
    .all(id);

  const architecture = db
    .prepare("SELECT id, title, updated_at FROM architecture_docs WHERE project_id = ? ORDER BY updated_at DESC")
    .all(id);

  const testTotal = db
    .prepare("SELECT COUNT(*) as total FROM tests WHERE project_id = ?")
    .get(id) as { total: number };

  const testStatusRows = db
    .prepare("SELECT status, COUNT(*) as count FROM tests WHERE project_id = ? GROUP BY status")
    .all(id) as { status: string; count: number }[];

  return NextResponse.json({
    project,
    epics,
    requirements: {
      total: requirementTotals.total,
      implemented: requirementTotals.implemented,
      without_epic: requirementTotals.without_epic,
      by_status: countByStatus(requirementStatuses, requirementStatusRows),
    },
    architecture,
    tests: {
      total: testTotal.total,
      by_status: countByStatus(testStatuses, testStatusRows),
    },
  });
}
