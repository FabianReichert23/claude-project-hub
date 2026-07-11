import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const existing = db.prepare("SELECT * FROM projects WHERE id = ?").get(id) as
    | { name: string; description: string }
    | undefined;
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const name = body.name ?? existing.name;
  const description = body.description ?? existing.description;

  db.prepare(
    "UPDATE projects SET name = ?, description = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(name, description, id);

  const updated = db.prepare("SELECT * FROM projects WHERE id = ?").get(id);
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  db.prepare("DELETE FROM projects WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
