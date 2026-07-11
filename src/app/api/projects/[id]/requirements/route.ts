import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

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
  const { title, description = "", priority = "medium", status = "draft", implemented = 0 } = body;
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const result = db
    .prepare(
      "INSERT INTO requirements (project_id, title, description, priority, status, implemented) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(id, title, description, priority, status, implemented ? 1 : 0);

  const row = db.prepare("SELECT * FROM requirements WHERE id = ?").get(result.lastInsertRowid);
  return NextResponse.json(row, { status: 201 });
}
