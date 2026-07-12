import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { echo } from "@/lib/echoResponse";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const rows = db
    .prepare("SELECT * FROM comments WHERE requirement_id = ? ORDER BY created_at ASC")
    .all(id);
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
    .prepare("INSERT INTO comments (requirement_id, content) VALUES (?, ?)")
    .run(id, content);

  const row = db
    .prepare("SELECT * FROM comments WHERE id = ?")
    .get(result.lastInsertRowid) as Record<string, unknown>;
  return echo(req, row, { status: 201 });
}
