import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { ArchitectureDoc } from "@/lib/types";
import { echo } from "@/lib/echoResponse";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const row = db.prepare("SELECT * FROM architecture_docs WHERE id = ?").get(id);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const existing = db.prepare("SELECT * FROM architecture_docs WHERE id = ?").get(id) as
    | ArchitectureDoc
    | undefined;
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const title = body.title ?? existing.title;
  const content = body.content ?? existing.content;

  db.prepare(
    "UPDATE architecture_docs SET title = ?, content = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(title, content, id);

  const updated = db.prepare("SELECT * FROM architecture_docs WHERE id = ?").get(id) as Record<
    string,
    unknown
  >;
  return echo(req, updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  db.prepare("DELETE FROM architecture_docs WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
