import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { echo } from "@/lib/echoResponse";
import { leanList } from "@/lib/leanList";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const rows = db
    .prepare("SELECT * FROM tests WHERE project_id = ? ORDER BY created_at DESC")
    .all(id) as Record<string, unknown>[];
  return leanList(req, rows, ["description", "steps", "expected_result"]);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const {
    title,
    description = "",
    steps = "",
    expected_result = "",
    status = "pending",
    requirement_id = null,
  } = body;
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const result = db
    .prepare(
      `INSERT INTO tests (project_id, requirement_id, title, description, steps, expected_result, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, requirement_id, title, description, steps, expected_result, status);

  const row = db
    .prepare("SELECT * FROM tests WHERE id = ?")
    .get(result.lastInsertRowid) as Record<string, unknown>;
  return echo(req, row, { status: 201 });
}
