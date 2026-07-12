import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { echo } from "@/lib/echoResponse";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const rows = db
    .prepare("SELECT * FROM requirements WHERE project_id = ? ORDER BY created_at DESC")
    .all(id);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const {
    title,
    description = "",
    priority = "medium",
    status = "draft",
    type = "requirement",
    implemented = 0,
    epic_id = null,
  } = body;
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
  if (type !== "requirement" && type !== "bug") {
    return NextResponse.json({ error: "type must be 'requirement' or 'bug'" }, { status: 400 });
  }

  const result = db
    .prepare(
      "INSERT INTO requirements (project_id, epic_id, title, description, priority, status, type, implemented) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .run(id, epic_id, title, description, priority, status, type, implemented ? 1 : 0);

  const row = db
    .prepare("SELECT * FROM requirements WHERE id = ?")
    .get(result.lastInsertRowid) as Record<string, unknown>;
  return echo(req, row, { status: 201 });
}
