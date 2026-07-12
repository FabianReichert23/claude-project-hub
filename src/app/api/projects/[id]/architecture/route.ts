import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { echo } from "@/lib/echoResponse";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const rows = db
    .prepare("SELECT * FROM architecture_docs WHERE project_id = ? ORDER BY updated_at DESC")
    .all(id);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const { title, content = "" } = body;
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const result = db
    .prepare("INSERT INTO architecture_docs (project_id, title, content) VALUES (?, ?, ?)")
    .run(id, title, content);

  const row = db
    .prepare("SELECT * FROM architecture_docs WHERE id = ?")
    .get(result.lastInsertRowid) as Record<string, unknown>;
  return echo(req, row, { status: 201 });
}
