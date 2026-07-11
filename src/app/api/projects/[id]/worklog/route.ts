import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Math.max(1, parseInt(limitParam, 10) || 5) : 5;
  const rows = db
    .prepare(
      "SELECT * FROM worklog_entries WHERE project_id = ? ORDER BY created_at DESC, id DESC LIMIT ?"
    )
    .all(id, limit);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const { content } = body;
  if (!content || typeof content !== "string" || !content.trim()) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const result = db
    .prepare("INSERT INTO worklog_entries (project_id, content) VALUES (?, ?)")
    .run(id, content);

  const row = db.prepare("SELECT * FROM worklog_entries WHERE id = ?").get(result.lastInsertRowid);
  return NextResponse.json(row, { status: 201 });
}
